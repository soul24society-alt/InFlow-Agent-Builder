const { ACTIVE_NETWORK, NATIVE_TOKEN } = require('../config/constants');
const { getClient, getBalance: getWalletBalance, getOwnedObjects, getObject } = require('../utils/blockchain');
const {
  successResponse,
  errorResponse,
  validateRequiredFields,
  getTxExplorerUrl,
  getAddressExplorerUrl,
  getObjectExplorerUrl,
  mistToOct,
  logTransaction,
} = require('../utils/helpers');

/**
 * GET /wallet/balance/:address
 * Returns OCT balance for any address.
 */
async function getWalletInfo(req, res) {
  try {
    const { address } = req.params;
    const balInfo = await getWalletBalance(address);
    return res.json(successResponse({
      address,
      balance: balInfo.inOCT,
      balanceMist: balInfo.totalBalance,
      formatted: balInfo.formatted,
      currency: NATIVE_TOKEN,
      network: ACTIVE_NETWORK,
      explorerUrl: getAddressExplorerUrl(address),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /wallet/objects/:address
 * Lists all objects (tokens, NFTs, etc.) owned by an address.
 */
async function getOwnedObjectsList(req, res) {
  try {
    const { address } = req.params;
    const { cursor, limit = '20' } = req.query;
    const objects = await getOwnedObjects(address, cursor || null, parseInt(limit));

    const items = (objects.data ?? []).map(o => ({
      objectId: o.data?.objectId,
      objectType: o.data?.type,
      version: o.data?.version,
      digest: o.data?.digest,
      explorerUrl: getObjectExplorerUrl(o.data?.objectId),
    }));

    return res.json(successResponse({
      address,
      objects: items,
      nextCursor: objects.nextCursor,
      hasNextPage: objects.hasNextPage,
      network: ACTIVE_NETWORK,
      explorerUrl: getAddressExplorerUrl(address),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /wallet/tx/:digest
 * Returns status and details for a transaction by digest.
 */
async function getTransactionStatus(req, res) {
  try {
    const { digest } = req.params;
    const client = getClient();
    const tx = await client.getTransactionBlock({
      digest,
      options: { showEffects: true, showInput: true, showEvents: true },
    });

    if (!tx) return res.status(404).json(errorResponse('Transaction not found'));

    const effects = tx.effects ?? {};
    const status = effects.status?.status ?? 'unknown';

    return res.json(successResponse({
      digest,
      status,
      sender: tx.transaction?.data?.sender,
      checkpoint: tx.checkpoint,
      timestampMs: tx.timestampMs,
      gasUsed: effects.gasUsed,
      eventsCount: tx.events?.length ?? 0,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /wallet/history/:address
 * Returns recent transactions sent by an address.
 */
async function getWalletHistory(req, res) {
  try {
    const { address } = req.params;
    const { limit = '20' } = req.query;
    const pageSize = Math.max(1, Math.min(parseInt(limit, 10) || 20, 50));

    const client = getClient();
    const baseOptions = {
      options: { showEffects: true, showInput: false },
      limit: pageSize,
      order: 'descending',
    };

    const [sentResult, receivedResult] = await Promise.all([
      client.queryTransactionBlocks({
        filter: { FromAddress: address },
        ...baseOptions,
      }),
      client.queryTransactionBlocks({
        filter: { ToAddress: address },
        ...baseOptions,
      }),
    ]);

    const mergedTransactions = new Map();
    const addTransactions = (items = [], direction) => {
      for (const tx of items) {
        if (!tx?.digest) continue;

        const existing = mergedTransactions.get(tx.digest);
        const directions = new Set(existing?.directions || []);
        directions.add(direction);

        mergedTransactions.set(tx.digest, {
          tx: existing?.tx || tx,
          directions: Array.from(directions),
        });
      }
    };

    addTransactions(sentResult.data, 'outgoing');
    addTransactions(receivedResult.data, 'incoming');

    const transactions = Array.from(mergedTransactions.values())
      .map(({ tx, directions }) => ({
        digest: tx.digest,
        status: tx.effects?.status?.status ?? 'unknown',
        timestampMs: tx.timestampMs,
        checkpoint: tx.checkpoint,
        direction: directions.length > 1 ? 'self' : directions[0] || 'unknown',
        explorerUrl: getTxExplorerUrl(tx.digest),
      }))
      .sort((a, b) => Number(b.timestampMs || 0) - Number(a.timestampMs || 0))
      .slice(0, pageSize);

    return res.json(successResponse({
      address,
      transactions,
      sentCount: sentResult.data?.length ?? 0,
      receivedCount: receivedResult.data?.length ?? 0,
      nextCursor: null,
      sentNextCursor: sentResult.nextCursor ?? null,
      receivedNextCursor: receivedResult.nextCursor ?? null,
      hasNextPage: Boolean(sentResult.hasNextPage || receivedResult.hasNextPage),
      network: ACTIVE_NETWORK,
      explorerUrl: getAddressExplorerUrl(address),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /wallet/object/:objectId
 * Returns full details of any on-chain object.
 */
async function getObjectInfo(req, res) {
  try {
    const { objectId } = req.params;
    const obj = await getObject(objectId);
    if (!obj?.data) return res.status(404).json(errorResponse('Object not found'));

    return res.json(successResponse({
      objectId,
      objectType: obj.data.type,
      version: obj.data.version,
      digest: obj.data.digest,
      owner: obj.data.owner,
      fields: obj.data.content?.fields ?? null,
      network: ACTIVE_NETWORK,
      explorerUrl: getObjectExplorerUrl(objectId),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = {
  getWalletInfo,
  getOwnedObjectsList,
  getTransactionStatus,
  getWalletHistory,
  getObjectInfo,
};
