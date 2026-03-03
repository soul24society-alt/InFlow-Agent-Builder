const crypto = require('crypto');
const supabase = require('../config/supabase');

// ---------------------------------------------------------------------------
// In-memory fallback (used when Supabase is not configured)
// ---------------------------------------------------------------------------
const memDaos = new Map();
const memProposals = new Map();
// memVotes: proposalId -> Map<voterAddress, vote>
const memVotes = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nowIso() { return new Date().toISOString(); }

function autoExpireStatus(proposal) {
  if (proposal.status === 'active' && new Date() > new Date(proposal.ends_at)) {
    const yes = proposal.votes_yes ?? 0;
    const no  = proposal.votes_no  ?? 0;
    return yes > no ? 'passed' : 'rejected';
  }
  return proposal.status;
}

function formatProposalResponse(proposal, voterCount = 0) {
  const yes     = proposal.votes_yes     ?? 0;
  const no      = proposal.votes_no      ?? 0;
  const abstain = proposal.votes_abstain ?? 0;
  const total   = yes + no + abstain;
  return {
    proposalId:  proposal.proposal_id,
    daoId:       proposal.dao_id,
    daoName:     proposal.dao_name,
    title:       proposal.title,
    description: proposal.description,
    proposer:    proposal.proposer,
    actions:     proposal.actions,
    status:      autoExpireStatus(proposal),
    votes:       { yes, no, abstain },
    endsAt:      proposal.ends_at,
    createdAt:   proposal.created_at,
    stats: {
      totalVotes:  total,
      yesPercent:  total > 0 ? `${((yes  / total) * 100).toFixed(1)}%` : '0.0%',
      noPercent:   total > 0 ? `${((no   / total) * 100).toFixed(1)}%` : '0.0%',
      voterCount
    }
  };
}

function formatDaoResponse(dao) {
  return {
    daoId:            dao.dao_id,
    name:             dao.name,
    description:      dao.description,
    creator:          dao.creator,
    votingPeriodDays: dao.voting_period_days,
    quorumPercent:    dao.quorum_percent,
    onChainPackageId: dao.on_chain_package_id,
    status:           dao.status,
    proposalCount:    dao.proposal_count,
    members:          dao.members,
    createdAt:        dao.created_at
  };
}

// ---------------------------------------------------------------------------
// CREATE DAO  –  POST /governance/create-dao
// ---------------------------------------------------------------------------
async function createDAO(req, res) {
  try {
    const {
      name,
      description = '',
      votingPeriodDays = 7,
      quorumPercent = 51,
      walletAddress
    } = req.body;

    if (!name)          return res.status(400).json({ success: false, error: 'name is required' });
    if (!walletAddress) return res.status(400).json({ success: false, error: 'walletAddress is required' });

    const daoId = `dao_${crypto.randomBytes(8).toString('hex')}`;
    const now   = nowIso();

    if (supabase) {
      const { data, error } = await supabase
        .from('governance_daos')
        .insert({
          dao_id:             daoId,
          name,
          description,
          creator:            walletAddress,
          voting_period_days: Number(votingPeriodDays),
          quorum_percent:     Number(quorumPercent),
          on_chain_package_id: null,
          status:             'active',
          proposal_count:     0,
          members:            [walletAddress],
          created_at:         now
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`[Governance] Created DAO: ${daoId} (${name}) by ${walletAddress}`);
      return res.status(201).json({ success: true, dao: formatDaoResponse(data), message: `DAO "${name}" created successfully.` });
    }

    // In-memory fallback
    const dao = {
      dao_id: daoId, name, description, creator: walletAddress,
      voting_period_days: Number(votingPeriodDays), quorum_percent: Number(quorumPercent),
      on_chain_package_id: null, status: 'active', proposal_count: 0,
      members: [walletAddress], created_at: now
    };
    memDaos.set(daoId, dao);
    console.log(`[Governance][mem] Created DAO: ${daoId}`);
    return res.status(201).json({ success: true, dao: formatDaoResponse(dao), message: `DAO "${name}" created successfully.` });

  } catch (error) {
    console.error('[Governance] Create DAO error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ---------------------------------------------------------------------------
// LIST DAOs  –  GET /governance/daos
// ---------------------------------------------------------------------------
async function listDAOs(req, res) {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('governance_daos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, daos: data.map(formatDaoResponse), total: data.length });
    }
    const daos = Array.from(memDaos.values()).map(formatDaoResponse);
    return res.json({ success: true, daos, total: daos.length });
  } catch (error) {
    console.error('[Governance] List DAOs error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ---------------------------------------------------------------------------
// GET DAO  –  GET /governance/dao/:daoId
// ---------------------------------------------------------------------------
async function getDAO(req, res) {
  try {
    const { daoId } = req.params;
    if (supabase) {
      const { data: dao, error: daoErr } = await supabase
        .from('governance_daos')
        .select('*')
        .eq('dao_id', daoId)
        .single();
      if (daoErr || !dao) return res.status(404).json({ success: false, error: 'DAO not found' });

      const { data: proposals } = await supabase
        .from('governance_proposals')
        .select('*')
        .eq('dao_id', daoId)
        .order('created_at', { ascending: false });

      return res.json({
        success: true,
        dao: formatDaoResponse(dao),
        proposals: (proposals || []).map(p => formatProposalResponse(p))
      });
    }
    const dao = memDaos.get(daoId);
    if (!dao) return res.status(404).json({ success: false, error: 'DAO not found' });
    const proposals = Array.from(memProposals.values())
      .filter(p => p.dao_id === daoId)
      .map(p => formatProposalResponse(p));
    return res.json({ success: true, dao: formatDaoResponse(dao), proposals });
  } catch (error) {
    console.error('[Governance] Get DAO error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ---------------------------------------------------------------------------
// CREATE PROPOSAL  –  POST /governance/proposal
// ---------------------------------------------------------------------------
async function createProposal(req, res) {
  try {
    const { daoId, title, description = '', walletAddress, actions = [] } = req.body;

    if (!daoId)         return res.status(400).json({ success: false, error: 'daoId is required' });
    if (!title)         return res.status(400).json({ success: false, error: 'title is required' });
    if (!walletAddress) return res.status(400).json({ success: false, error: 'walletAddress is required' });

    const proposalId = `prop_${crypto.randomBytes(8).toString('hex')}`;
    const now        = new Date();

    if (supabase) {
      const { data: dao, error: daoErr } = await supabase
        .from('governance_daos')
        .select('name, voting_period_days, proposal_count')
        .eq('dao_id', daoId)
        .single();
      if (daoErr || !dao) return res.status(404).json({ success: false, error: `DAO ${daoId} not found` });

      const endsAt = new Date(now.getTime() + dao.voting_period_days * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('governance_proposals')
        .insert({
          proposal_id:  proposalId,
          dao_id:       daoId,
          dao_name:     dao.name,
          title,
          description,
          proposer:     walletAddress,
          actions,
          status:       'active',
          votes_yes:    0,
          votes_no:     0,
          votes_abstain: 0,
          ends_at:      endsAt.toISOString(),
          created_at:   now.toISOString()
        })
        .select()
        .single();
      if (error) throw error;

      // Increment proposal_count
      await supabase
        .from('governance_daos')
        .update({ proposal_count: dao.proposal_count + 1 })
        .eq('dao_id', daoId);

      console.log(`[Governance] Created proposal: ${proposalId} in DAO ${daoId}`);
      return res.status(201).json({
        success: true,
        proposal: formatProposalResponse(data),
        message: `Proposal "${title}" created in DAO "${dao.name}". Voting ends ${endsAt.toISOString()}.`
      });
    }

    // In-memory fallback
    const dao = memDaos.get(daoId);
    if (!dao) return res.status(404).json({ success: false, error: `DAO ${daoId} not found` });
    const endsAt = new Date(now.getTime() + dao.voting_period_days * 24 * 60 * 60 * 1000);
    const proposal = {
      proposal_id: proposalId, dao_id: daoId, dao_name: dao.name,
      title, description, proposer: walletAddress, actions, status: 'active',
      votes_yes: 0, votes_no: 0, votes_abstain: 0,
      ends_at: endsAt.toISOString(), created_at: now.toISOString()
    };
    memProposals.set(proposalId, proposal);
    dao.proposal_count += 1;
    return res.status(201).json({
      success: true,
      proposal: formatProposalResponse(proposal),
      message: `Proposal "${title}" created in DAO "${dao.name}". Voting ends ${endsAt.toISOString()}.`
    });

  } catch (error) {
    console.error('[Governance] Create proposal error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ---------------------------------------------------------------------------
// VOTE ON PROPOSAL  –  POST /governance/vote
// ---------------------------------------------------------------------------
async function voteOnProposal(req, res) {
  try {
    const { proposalId, vote, walletAddress } = req.body;

    if (!proposalId)    return res.status(400).json({ success: false, error: 'proposalId is required' });
    if (!vote)          return res.status(400).json({ success: false, error: 'vote is required (yes/no/abstain)' });
    if (!walletAddress) return res.status(400).json({ success: false, error: 'walletAddress is required' });

    const normalizedVote = vote.toLowerCase().trim();
    if (!['yes', 'no', 'abstain'].includes(normalizedVote)) {
      return res.status(400).json({ success: false, error: 'vote must be yes, no, or abstain' });
    }

    if (supabase) {
      const { data: proposal, error: propErr } = await supabase
        .from('governance_proposals')
        .select('*')
        .eq('proposal_id', proposalId)
        .single();

      if (propErr || !proposal) return res.status(404).json({ success: false, error: `Proposal ${proposalId} not found` });
      if (proposal.status !== 'active') return res.status(400).json({ success: false, error: `Proposal is ${proposal.status}, voting is closed` });
      if (new Date() > new Date(proposal.ends_at)) {
        await supabase.from('governance_proposals').update({ status: 'expired' }).eq('proposal_id', proposalId);
        return res.status(400).json({ success: false, error: 'Voting period has ended' });
      }

      // Check for existing vote
      const { data: existing } = await supabase
        .from('governance_votes')
        .select('vote')
        .eq('proposal_id', proposalId)
        .eq('voter_address', walletAddress)
        .maybeSingle();

      // Calculate updated counts
      const delta = { votes_yes: proposal.votes_yes, votes_no: proposal.votes_no, votes_abstain: proposal.votes_abstain };
      if (existing) {
        if (existing.vote === 'yes')     delta.votes_yes     = Math.max(0, delta.votes_yes - 1);
        else if (existing.vote === 'no') delta.votes_no      = Math.max(0, delta.votes_no - 1);
        else                             delta.votes_abstain = Math.max(0, delta.votes_abstain - 1);
      }
      if (normalizedVote === 'yes')     delta.votes_yes     += 1;
      else if (normalizedVote === 'no') delta.votes_no      += 1;
      else                              delta.votes_abstain += 1;

      // Upsert vote record
      const { error: voteErr } = await supabase
        .from('governance_votes')
        .upsert(
          { proposal_id: proposalId, voter_address: walletAddress, vote: normalizedVote, updated_at: nowIso() },
          { onConflict: 'proposal_id,voter_address' }
        );
      if (voteErr) throw voteErr;

      // Update proposal vote counts
      const { error: updateErr } = await supabase
        .from('governance_proposals')
        .update(delta)
        .eq('proposal_id', proposalId);
      if (updateErr) throw updateErr;

      const { count: voterCount } = await supabase
        .from('governance_votes')
        .select('*', { count: 'exact', head: true })
        .eq('proposal_id', proposalId);

      const totalVotes = delta.votes_yes + delta.votes_no + delta.votes_abstain;
      console.log(`[Governance] ${walletAddress} voted ${normalizedVote} on ${proposalId}`);
      return res.json({
        success: true,
        proposalId,
        vote: normalizedVote,
        voter: walletAddress,
        tally: { yes: delta.votes_yes, no: delta.votes_no, abstain: delta.votes_abstain },
        totalVotes,
        voterCount: voterCount ?? 0,
        message: `Vote "${normalizedVote.toUpperCase()}" recorded. Tally: Yes ${delta.votes_yes}, No ${delta.votes_no}, Abstain ${delta.votes_abstain}`
      });
    }

    // In-memory fallback
    const proposal = memProposals.get(proposalId);
    if (!proposal) return res.status(404).json({ success: false, error: `Proposal ${proposalId} not found` });
    if (proposal.status !== 'active') return res.status(400).json({ success: false, error: `Proposal is ${proposal.status}, voting is closed` });
    if (new Date() > new Date(proposal.ends_at)) {
      proposal.status = 'expired';
      return res.status(400).json({ success: false, error: 'Voting period has ended' });
    }
    if (!memVotes.has(proposalId)) memVotes.set(proposalId, new Map());
    const voterMap = memVotes.get(proposalId);
    const prevVote = voterMap.get(walletAddress);
    if (prevVote) {
      if (prevVote === 'yes')     proposal.votes_yes     = Math.max(0, proposal.votes_yes - 1);
      else if (prevVote === 'no') proposal.votes_no      = Math.max(0, proposal.votes_no - 1);
      else                        proposal.votes_abstain = Math.max(0, proposal.votes_abstain - 1);
    }
    voterMap.set(walletAddress, normalizedVote);
    if (normalizedVote === 'yes')     proposal.votes_yes     += 1;
    else if (normalizedVote === 'no') proposal.votes_no      += 1;
    else                              proposal.votes_abstain += 1;
    const total = proposal.votes_yes + proposal.votes_no + proposal.votes_abstain;
    return res.json({
      success: true,
      proposalId,
      vote: normalizedVote,
      voter: walletAddress,
      tally: { yes: proposal.votes_yes, no: proposal.votes_no, abstain: proposal.votes_abstain },
      totalVotes: total,
      voterCount: voterMap.size,
      message: `Vote "${normalizedVote.toUpperCase()}" recorded. Tally: Yes ${proposal.votes_yes}, No ${proposal.votes_no}, Abstain ${proposal.votes_abstain}`
    });

  } catch (error) {
    console.error('[Governance] Vote error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ---------------------------------------------------------------------------
// GET PROPOSAL  –  GET /governance/proposal/:proposalId
// ---------------------------------------------------------------------------
async function getProposal(req, res) {
  try {
    const { proposalId } = req.params;

    if (supabase) {
      const { data: proposal, error } = await supabase
        .from('governance_proposals')
        .select('*')
        .eq('proposal_id', proposalId)
        .single();
      if (error || !proposal) return res.status(404).json({ success: false, error: 'Proposal not found' });

      // Auto-expire if past end date
      const currentStatus = autoExpireStatus(proposal);
      if (currentStatus !== proposal.status) {
        await supabase.from('governance_proposals').update({ status: currentStatus }).eq('proposal_id', proposalId);
        proposal.status = currentStatus;
      }

      const { count: voterCount } = await supabase
        .from('governance_votes')
        .select('*', { count: 'exact', head: true })
        .eq('proposal_id', proposalId);

      return res.json({ success: true, proposal: formatProposalResponse(proposal, voterCount ?? 0) });
    }

    // In-memory fallback
    const proposal = memProposals.get(proposalId);
    if (!proposal) return res.status(404).json({ success: false, error: 'Proposal not found' });
    const currentStatus = autoExpireStatus(proposal);
    if (currentStatus !== proposal.status) proposal.status = currentStatus;
    const voterCount = memVotes.has(proposalId) ? memVotes.get(proposalId).size : 0;
    return res.json({ success: true, proposal: formatProposalResponse(proposal, voterCount) });

  } catch (error) {
    console.error('[Governance] Get proposal error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ---------------------------------------------------------------------------
// LIST PROPOSALS  –  GET /governance/proposals?daoId=xxx
// ---------------------------------------------------------------------------
async function listProposals(req, res) {
  try {
    const { daoId } = req.query;
    if (supabase) {
      let query = supabase.from('governance_proposals').select('*').order('created_at', { ascending: false });
      if (daoId) query = query.eq('dao_id', daoId);
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ success: true, proposals: (data || []).map(p => formatProposalResponse(p)), total: (data || []).length });
    }
    let proposals = Array.from(memProposals.values());
    if (daoId) proposals = proposals.filter(p => p.dao_id === daoId);
    return res.json({ success: true, proposals: proposals.map(p => formatProposalResponse(p)), total: proposals.length });
  } catch (error) {
    console.error('[Governance] List proposals error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
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

