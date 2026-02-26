const express = require('express');
const router = express.Router();
const {
  createDAO,
  listDAOs,
  getDAO,
  createProposal,
  voteOnProposal,
  getProposal,
  listProposals
} = require('../controllers/governanceController');

// DAO endpoints
router.post('/create-dao', createDAO);
router.get('/daos', listDAOs);
router.get('/dao/:daoId', getDAO);

// Proposal endpoints
router.post('/proposal', createProposal);
router.get('/proposals', listProposals);
router.get('/proposal/:proposalId', getProposal);

// Voting
router.post('/vote', voteOnProposal);

module.exports = router;
