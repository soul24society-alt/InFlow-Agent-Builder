const express = require('express');
const {
  getPools,
  getSwapQuote,
  swapTokens,
  getTokenPrice,
  crossBorderTransfer,
  checkOneId,
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

module.exports = router;
