const express = require('express');
const { transfer, transferToken, prepareTransfer, getBalance, airdrop } = require('../controllers/transferController');

const router = express.Router();

// Transfer native OCT (server-side signing)
router.post('/', transfer);

// Transfer any Move object (Token/NFT) by objectId
router.post('/object', transferToken);

// Build PTB for client-side wallet signing
router.post('/prepare', prepareTransfer);

// Get OCT balance for an address
router.get('/balance/:address', getBalance);

// Airdrop OCT to multiple recipients in one PTB
router.post('/airdrop', airdrop);

module.exports = router;
