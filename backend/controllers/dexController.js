const axios = require('axios');
const { Transaction } = require('@mysten/sui/transactions');
const {
  ACTIVE_NETWORK,
  ONEDEX_PACKAGE_ID,
  ONETRANSFER_PACKAGE_ID,
  ONEID_PACKAGE_ID,
} = require('../config/constants');
const { getClient, getKeypair, executeTransaction } = require('../utils/blockchain');
const {
  successResponse,
  errorResponse,
  validateRequiredFields,
  getTxExplorerUrl,
  logTransaction,
} = require('../utils/helpers');

// ONEDEX API (public read endpoints — no auth required for read ops)
const ONEDEX_API = process.env.ONEDEX_API_URL || 'https://api.onedex.app';

/**
 * GET /dex/pools — list all available trading pools on ONEDEX
 */
async function getPools(req, res) {
  try {
    const resp = await axios.get(`${ONEDEX_API}/pools`, { timeout: 8000 }).catch(() => null);
    if (resp && resp.data) {
      return res.json(successResponse({ pools: resp.data }));
    }
    // ONEDEX public API may not be stable yet — return a helpful response
    return res.json(successResponse({
      message: 'ONEDEX is the native DEX on OneChain. Pool data will be available once ONEDEX public API is live.',
      onedex_package: ONEDEX_PACKAGE_ID || 'Not configured',
      docs: 'https://docs.onelabs.cc/Products',
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * POST /dex/quote — get a swap price quote without executing
 * Body: { tokenIn, tokenOut, amountIn }
 */
async function getSwapQuote(req, res) {
  try {
    const { tokenIn, tokenOut, amountIn } = req.body;
    const validationError = validateRequiredFields(req.body, ['tokenIn', 'tokenOut', 'amountIn']);
    if (validationError) return res.status(400).json(validationError);

    // Try ONEDEX quote API
    const resp = await axios.get(`${ONEDEX_API}/quote`, {
      params: { tokenIn, tokenOut, amountIn },
      timeout: 8000,
    }).catch(() => null);

    if (resp && resp.data) {
      return res.json(successResponse({
        tokenIn,
        tokenOut,
        amountIn,
        quote: resp.data,
      }));
    }

    // Fallback: informational response while ONEDEX API matures
    return res.json(successResponse({
      tokenIn,
      tokenOut,
      amountIn,
      message: `Swap quote for ${amountIn} ${tokenIn} → ${tokenOut} requested. ONEDEX on-chain swap is available via package ${ONEDEX_PACKAGE_ID || '(configure ONEDEX_PACKAGE_ID)'}. Live quote requires ONEDEX API endpoint.`,
      network: ACTIVE_NETWORK,
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * POST /dex/swap — execute a token swap on ONEDEX
 * Body: { privateKey, tokenIn, tokenOut, amountIn, minAmountOut, poolId }
 */
async function swapTokens(req, res) {
  try {
    const { privateKey, tokenIn, tokenOut, amountIn, minAmountOut, poolId } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'tokenIn', 'tokenOut', 'amountIn']);
    if (validationError) return res.status(400).json(validationError);

    if (!ONEDEX_PACKAGE_ID) {
      return res.status(503).json(errorResponse(
        'ONEDEX_PACKAGE_ID is not configured. Set it in your .env file once ONEDEX is deployed on the active network.'
      ));
    }

    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();
    logTransaction('DEX Swap', { tokenIn, tokenOut, amountIn, sender: senderAddress });

    const client = getClient();
    const tx = new Transaction();

    // ONEDEX swap Move call
    // Module: onedex::router, function: swap_exact_input
    tx.moveCall({
      target: `${ONEDEX_PACKAGE_ID}::router::swap_exact_input`,
      arguments: [
        tx.pure.address(poolId || ''),
        tx.pure.u64(BigInt(Math.round(parseFloat(amountIn) * 1e9))),
        tx.pure.u64(BigInt(Math.round(parseFloat(minAmountOut || 0) * 1e9))),
      ],
      typeArguments: [tokenIn, tokenOut],
    });

    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;

    return res.json(successResponse({
      transactionDigest: digest,
      from: senderAddress,
      tokenIn,
      tokenOut,
      amountIn,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /dex/price/:token — get token price from ONEDEX
 */
async function getTokenPrice(req, res) {
  try {
    const { token } = req.params;
    const resp = await axios.get(`${ONEDEX_API}/price/${token}`, { timeout: 8000 }).catch(() => null);

    if (resp && resp.data) {
      return res.json(successResponse({ token, price: resp.data }));
    }

    return res.json(successResponse({
      token,
      message: `Price for ${token} on ONEDEX. Live pricing requires ONEDEX API. Package: ${ONEDEX_PACKAGE_ID || '(configure ONEDEX_PACKAGE_ID)'}.`,
      network: ACTIVE_NETWORK,
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * POST /dex/onetransfer — cross-border / fiat transfer via ONETRANSFER
 * Body: { privateKey, recipient, amount, currency, targetCurrency }
 */
async function crossBorderTransfer(req, res) {
  try {
    const { privateKey, recipient, amount, currency, targetCurrency } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'recipient', 'amount', 'currency']);
    if (validationError) return res.status(400).json(validationError);

    if (!ONETRANSFER_PACKAGE_ID) {
      return res.status(503).json(errorResponse(
        'ONETRANSFER_PACKAGE_ID is not configured. Set it in your .env file once ONETRANSFER is deployed.'
      ));
    }

    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();
    logTransaction('ONETRANSFER Cross-Border', { recipient, amount, currency, sender: senderAddress });

    const tx = new Transaction();
    tx.moveCall({
      target: `${ONETRANSFER_PACKAGE_ID}::transfer::send`,
      arguments: [
        tx.pure.address(recipient),
        tx.pure.u64(BigInt(Math.round(parseFloat(amount) * 1e9))),
        tx.pure.string(currency),
        tx.pure.string(targetCurrency || currency),
      ],
    });

    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;

    return res.json(successResponse({
      transactionDigest: digest,
      from: senderAddress,
      recipient,
      amount,
      currency,
      targetCurrency: targetCurrency || currency,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /dex/oneid/:address — check if wallet has a verified ONEID
 */
async function checkOneId(req, res) {
  try {
    const { address } = req.params;
    if (!address) return res.status(400).json(errorResponse('address is required'));

    if (!ONEID_PACKAGE_ID) {
      return res.json(successResponse({
        address,
        verified: false,
        message: 'ONEID_PACKAGE_ID is not configured. Set it in your .env file once ONEID is deployed.',
      }));
    }

    const client = getClient();
    // Query ONEID objects owned by this address
    const { data } = await client.getOwnedObjects({
      owner: address,
      filter: { StructType: `${ONEID_PACKAGE_ID}::oneid::OneID` },
      options: { showContent: true },
    });

    const verified = data.length > 0;
    const oneid = verified ? data[0]?.data?.content?.fields : null;

    return res.json(successResponse({
      address,
      verified,
      oneid: oneid || null,
      message: verified
        ? `Wallet ${address} has a verified ONEID.`
        : `Wallet ${address} does not have a ONEID yet.`,
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = {
  getPools,
  getSwapQuote,
  swapTokens,
  getTokenPrice,
  crossBorderTransfer,
  checkOneId,
};

/**
 * GET /dex/ons/:name — resolve a .one name to its wallet address
 * GET /dex/ons/reverse/:address — look up the .one name for a wallet address
 */
async function checkOns(req, res) {
  try {
    const { name } = req.params;  // e.g. "alice.one" or "alice"
    if (!name) return res.status(400).json(errorResponse('name is required'));

    if (!ONS_PACKAGE_ID) {
      return res.json(successResponse({
        name: name.endsWith('.one') ? name : `${name}.one`,
        resolved: false,
        address: null,
        message: 'ONS_PACKAGE_ID is not configured. ONS is coming soon on OneChain — set ONS_PACKAGE_ID once deployed.',
      }));
    }

    const client = getClient();
    const fullName = name.endsWith('.one') ? name : `${name}.one`;

    // Query the ONS registry for this name's owner object
    const { data } = await client.getOwnedObjects({
      owner: `${ONS_PACKAGE_ID}::ons::Registry`,
      filter: { StructType: `${ONS_PACKAGE_ID}::ons::NameRecord` },
      options: { showContent: true },
    }).catch(() => ({ data: [] }));

    const record = data.find(obj => obj?.data?.content?.fields?.name === fullName);
    if (record) {
      const fields = record.data.content.fields;
      return res.json(successResponse({
        name: fullName,
        resolved: true,
        address: fields.target_address || fields.address || null,
        expiry: fields.expiry || null,
        message: `${fullName} resolves to ${fields.target_address || fields.address}`,
      }));
    }

    return res.json(successResponse({
      name: fullName,
      resolved: false,
      address: null,
      message: `${fullName} is not registered on OneChain ONS.`,
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /dex/ons/reverse/:address — find the .one name for a wallet address
 */
async function reverseOns(req, res) {
  try {
    const { address } = req.params;
    if (!address) return res.status(400).json(errorResponse('address is required'));

    if (!ONS_PACKAGE_ID) {
      return res.json(successResponse({
        address,
        name: null,
        message: 'ONS_PACKAGE_ID is not configured. ONS is coming soon on OneChain.',
      }));
    }

    const client = getClient();
    // Query ONS name records owned by this address
    const { data } = await client.getOwnedObjects({
      owner: address,
      filter: { StructType: `${ONS_PACKAGE_ID}::ons::NameRecord` },
      options: { showContent: true },
    }).catch(() => ({ data: [] }));

    const record = data[0];
    if (record) {
      const name = record?.data?.content?.fields?.name || null;
      return res.json(successResponse({
        address,
        name,
        message: name ? `${address} owns the ONS name ${name}.` : 'No ONS name found for this address.',
      }));
    }

    return res.json(successResponse({
      address,
      name: null,
      message: `No ONS name registered for ${address}.`,
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = {
  getPools,
  getSwapQuote,
  swapTokens,
  getTokenPrice,
  crossBorderTransfer,
  checkOneId,
  checkOns,
  reverseOns,
};
