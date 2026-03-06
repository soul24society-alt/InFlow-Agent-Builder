const express = require('express');
const {
  getPools,
  getSwapQuote,
  swapTokens,
  getTokenPrice,
  crossBorderTransfer,
  checkOneId,
  checkOns,
  reverseOns,
} = require('../controllers/dexController');

const router = express.Router();

// ONEDEX
router.get('/pools', getPools);
router.post('/quote', getSwapQuote);
router.post('/swap', swapTokens);
router.get('/price/:token', getTokenPrice);

// ONETRANSFER
router.post('/cross-transfer', crossBorderTransfer);

// ONEID
router.get('/oneid/:address', checkOneId);

// ONS (OneChain Name Service)
router.get('/ons/reverse/:address', reverseOns);
router.get('/ons/:name', checkOns);

module.exports = router;
