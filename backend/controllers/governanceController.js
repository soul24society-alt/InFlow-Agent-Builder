const crypto = require('crypto');

// In-memory DAO registry (can be swapped for DB/on-chain later)
const daoRegistry = new Map();
const proposalRegistry = new Map();
const voteRegistry = new Map(); // voteId -> vote

/**
 * Create a new DAO
 * POST /governance/create-dao
 * Body: { name, description, votingPeriodDays, quorumPercent, walletAddress }
 */
async function createDAO(req, res) {
  try {
    const {
      name,
      description,
      votingPeriodDays = 7,
      quorumPercent = 51,
      walletAddress
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    if (!walletAddress) return res.status(400).json({ success: false, error: 'walletAddress is required' });

    const daoId = `dao_${crypto.randomBytes(8).toString('hex')}`;
    const dao = {
      daoId,
      name,
      description: description || '',
      creator: walletAddress,
      votingPeriodDays: Number(votingPeriodDays),
      quorumPercent: Number(quorumPercent),
      createdAt: new Date().toISOString(),
      proposalCount: 0,
      members: [walletAddress],
      // Stub: in production this would be the on-chain package ID
      onChainPackageId: null,
      status: 'active'
    };

    daoRegistry.set(daoId, dao);

    console.log(`[Governance] Created DAO: ${daoId} (${name}) by ${walletAddress}`);

    return res.status(201).json({
      success: true,
      dao,
      message: `DAO "${name}" created successfully. In production, deploy on OneChain with: one client publish --path ./governance`
    });
  } catch (error) {
    console.error('[Governance] Create DAO error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List all DAOs
 * GET /governance/daos
 */
function listDAOs(req, res) {
  const daos = Array.from(daoRegistry.values());
  return res.json({ success: true, daos, total: daos.length });
}

/**
 * Get DAO by ID
 * GET /governance/dao/:daoId
 */
function getDAO(req, res) {
  const dao = daoRegistry.get(req.params.daoId);
  if (!dao) return res.status(404).json({ success: false, error: 'DAO not found' });
  const proposals = Array.from(proposalRegistry.values()).filter(p => p.daoId === req.params.daoId);
  return res.json({ success: true, dao, proposals });
}

/**
 * Create a proposal
 * POST /governance/proposal
 * Body: { daoId, title, description, walletAddress, actions (optional) }
 */
async function createProposal(req, res) {
  try {
    const { daoId, title, description, walletAddress, actions = [] } = req.body;

    if (!daoId) return res.status(400).json({ success: false, error: 'daoId is required' });
    if (!title) return res.status(400).json({ success: false, error: 'title is required' });
    if (!walletAddress) return res.status(400).json({ success: false, error: 'walletAddress is required' });

    const dao = daoRegistry.get(daoId);
    if (!dao) return res.status(404).json({ success: false, error: `DAO ${daoId} not found` });

    const proposalId = `prop_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();
    const endsAt = new Date(now.getTime() + dao.votingPeriodDays * 24 * 60 * 60 * 1000);

    const proposal = {
      proposalId,
      daoId,
      daoName: dao.name,
      title,
      description: description || '',
      proposer: walletAddress,
      actions,
      createdAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      status: 'active', // active | passed | rejected | executed
      votes: { yes: 0, no: 0, abstain: 0 },
      voters: {}
    };

    proposalRegistry.set(proposalId, proposal);
    dao.proposalCount += 1;

    console.log(`[Governance] Created proposal: ${proposalId} in DAO ${daoId}`);

    return res.status(201).json({
      success: true,
      proposal,
      message: `Proposal "${title}" created in DAO "${dao.name}". Voting ends ${endsAt.toISOString()}.`
    });
  } catch (error) {
    console.error('[Governance] Create proposal error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Vote on a proposal
 * POST /governance/vote
 * Body: { proposalId, vote (yes/no/abstain), walletAddress }
 */
async function voteOnProposal(req, res) {
  try {
    const { proposalId, vote, walletAddress } = req.body;

    if (!proposalId) return res.status(400).json({ success: false, error: 'proposalId is required' });
    if (!vote) return res.status(400).json({ success: false, error: 'vote is required (yes/no/abstain)' });
    if (!walletAddress) return res.status(400).json({ success: false, error: 'walletAddress is required' });

    const normalizedVote = vote.toLowerCase().trim();
    if (!['yes', 'no', 'abstain'].includes(normalizedVote)) {
      return res.status(400).json({ success: false, error: 'vote must be yes, no, or abstain' });
    }

    const proposal = proposalRegistry.get(proposalId);
    if (!proposal) return res.status(404).json({ success: false, error: `Proposal ${proposalId} not found` });

    if (proposal.status !== 'active') {
      return res.status(400).json({ success: false, error: `Proposal is ${proposal.status}, voting is closed` });
    }

    if (new Date() > new Date(proposal.endsAt)) {
      proposal.status = 'expired';
      return res.status(400).json({ success: false, error: 'Voting period has ended' });
    }

    // Remove previous vote if exists
    const previousVote = proposal.voters[walletAddress];
    if (previousVote) {
      proposal.votes[previousVote] = Math.max(0, proposal.votes[previousVote] - 1);
    }

    // Record new vote
    proposal.voters[walletAddress] = normalizedVote;
    proposal.votes[normalizedVote] += 1;

    const totalVotes = proposal.votes.yes + proposal.votes.no + proposal.votes.abstain;

    console.log(`[Governance] Vote on ${proposalId}: ${walletAddress} voted ${normalizedVote}`);

    return res.json({
      success: true,
      proposalId,
      vote: normalizedVote,
      voter: walletAddress,
      tally: proposal.votes,
      totalVotes,
      message: `Vote "${normalizedVote.toUpperCase()}" recorded for proposal "${proposal.title}". Tally: Yes ${proposal.votes.yes}, No ${proposal.votes.no}, Abstain ${proposal.votes.abstain}`
    });
  } catch (error) {
    console.error('[Governance] Vote error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get proposal details
 * GET /governance/proposal/:proposalId
 */
function getProposal(req, res) {
  const proposal = proposalRegistry.get(req.params.proposalId);
  if (!proposal) return res.status(404).json({ success: false, error: 'Proposal not found' });

  // Auto-expire if past end date
  if (proposal.status === 'active' && new Date() > new Date(proposal.endsAt)) {
    const totalVotes = proposal.votes.yes + proposal.votes.no;
    proposal.status = totalVotes > 0 && proposal.votes.yes > proposal.votes.no ? 'passed' : 'rejected';
  }

  const totalVotes = proposal.votes.yes + proposal.votes.no + proposal.votes.abstain;
  const yesPercent = totalVotes > 0 ? ((proposal.votes.yes / totalVotes) * 100).toFixed(1) : '0.0';

  return res.json({
    success: true,
    proposal: {
      ...proposal,
      voters: undefined, // hide individual voter addresses in response
    },
    stats: {
      totalVotes,
      yesPercent: `${yesPercent}%`,
      noPercent: totalVotes > 0 ? `${((proposal.votes.no / totalVotes) * 100).toFixed(1)}%` : '0.0%',
      voterCount: Object.keys(proposal.voters).length
    }
  });
}

/**
 * List proposals for a DAO
 * GET /governance/proposals?daoId=xxx
 */
function listProposals(req, res) {
  const { daoId } = req.query;
  let proposals = Array.from(proposalRegistry.values());
  if (daoId) proposals = proposals.filter(p => p.daoId === daoId);
  return res.json({ success: true, proposals, total: proposals.length });
}

module.exports = {
  createDAO,
  listDAOs,
  getDAO,
  createProposal,
  voteOnProposal,
  getProposal,
  listProposals
};
