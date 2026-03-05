# OneChain Integration Strategy — OneHack 3.0

## Judging Criteria

| Criterion | Weight |
|---|---|
| Originality and creativity | ✅ |
| Technical execution | ✅ |
| Overall project potential | ✅ |
| Product usability and clarity | ✅ |
| **Meaningful use of OneChain infrastructure** | 🎯 Key focus |

Tracks: **AI-powered Applications** + **GameFi** (both)

---

## HIGH IMPACT — Add These to Win

### 1. DID (Decentralized Identity) Integration
OneChain's flagship differentiator — a 13-digit on-chain identity system.

**What to build:**
- Bind each user's deployed agents to their DID — agents are "owned" by an identity, not just a wallet address
- Display DID-linked agent history and reputation (workflows run, success rate, uptime)
- Implement **OAuth login flow**: Google → DID auto-created → OneWallet connected — users never see a seed phrase
- "Agent Creator Score" — a DID-based on-chain reputation for automation builders

**Why it wins:** DID is OneChain's most unique product. Using it deeply signals ecosystem commitment to judges.

---

### 2. Gas Sponsorship SDK (Zero Gas UX)
Lets applications pay gas on behalf of users — OneChain's developer-differentiating feature.

**What to build:**
- Add a **"Gas Budget" panel** in the agent builder — creator deposits OCT as the agent's gas pool
- Agents run in "sponsored gas" mode — end users execute agent workflows without holding any OCT
- Makes the "no-code blockchain automation for everyone" pitch airtight

**Why it wins:** Completes the no-barrier narrative. Most demo-able OneChain-native UX feature.

---

### 3. GameFi Agent Templates (Unlock the Second Track)
You already have NFT factory, token factory, webhook, and transfer primitives. Add GameFi wrappers.

**Templates to add:**
- **NFT Badge Agent** — monitors a webhook (game server), auto-mints dynamic NFT badges to top players
- **P2E Reward Distributor** — reads leaderboard input, auto-distributes OCT/token rewards to top N wallets
- **In-Game Marketplace Agent** — NL-powered: *"list my sword NFT for 50 OCT"* → executes Move calls

**Why it wins:** Unlocks the GameFi judging track on top of AI — doubles scoring surface with minimal new backend work.

---

### 4. USDO Stablecoin Support
OneChain's native yield-generating stablecoin (8% APY), the centerpiece of their DeFi narrative.

**What to build:**
- Add USDO as a first-class token alongside OCT in all transfer/payment/escrow tools
- Add a **"Staking Agent" template** — auto-stakes idle USDO, compounds rewards on a schedule
- Replace/augment OCT in the x402 payment demo with USDO to showcase their flagship financial product

**Why it wins:** Judges are from the OneChain ecosystem — using USDO signals you understand their DeFi vision.

---

### 5. ONS (One Name Service)
Readable `.one` wallet names stored as on-chain NFTs (like ENS for OneChain).

**What to build:**
- When an agent is deployed, optionally register `<agentname>.one` via the ONS Move contract
- Resolve `.one` names in the Contract Explorer and NL transfer flow
- Allow NL transfers targeting names: *"send 10 OCT to alice.one"*

**Why it wins:** Polished UX detail that shows depth of ecosystem integration.

---

## MEDIUM IMPACT — If Time Allows

### 6. Wormhole Cross-Chain Agents
A "Bridge & Execute" compound tool: bridge USDT from Ethereum → USDO on OneChain → trigger workflow.
Directly hits OneChain's 2026 roadmap focus on cross-chain expansion.

### 7. DID-Based Agent Marketplace
Public gallery of shared agents attributed to creator DIDs. Fork/clone popular agents. Leaderboard by DID reputation score.
Strong "potential beyond the hackathon" story for judges.

---

## The Winning Demo (3-Minute Script)

| Step | Feature Shown |
|---|---|
| 1. User logs in with Google | **DID** auto-created, OneWallet connected |
| 2. Types: *"Create a GameFi agent that mints NFT badges to top 3 players every Sunday and pays them 50 USDO"* | **AI Workflow generation** |
| 3. AI generates workflow DAG | **Agent Builder** (existing) |
| 4. Agent deploys with name `badge-bot.one`, gas sponsored | **ONS + Zero Gas** |
| 5. Test webhook fires | **GameFi Agent** executes |
| 6. NFTs minted + USDO transferred | **NFT Factory + USDO** |ppers.

| 7. All txns verifiable on-chain explorer | **OneChain Infrastructure** |

**Every judging criterion covered in one flow.**

---

## What NOT to Build

| Feature | Reason to Skip |
|---|---|
| OneRWA integration | Too complex for hackathon scope |
| Oracle usage | Listed as TODO in OneChain docs — unstable |
| Full Wormhole bridge | Nice-to-have, not a must |

---

## Current Project — What's Already Done

| Feature | Status |
|---|---|
| Token factory (deploy Move fungible tokens) | ✅ Done |
| NFT factory (deploy collections + mint) | ✅ Done |
| OCT transfers | ✅ Done |
| x402 payment escrow (OCT) | ✅ Done |
| OneWallet integration (`@mysten/dapp-kit`) | ✅ Done |
| AI workflow DAG generation | ✅ Done |
| NL → contract function caller | ✅ Done |
| Visual agent builder (React Flow) | ✅ Done |
| Agent chat interface | ✅ Done |
| DEX swap tools | ✅ Done |
| Governance/DAO tools | ✅ Done |
| Email automation | ✅ Done |
| Webhook triggers | ✅ Done |

---

## Integration Priority Order

```
1. Gas Sponsorship SDK     ← Fastest win, most demo-able
2. GameFi Agent Templates  ← Reuses existing code, unlocks second track
3. USDO support            ← Small change, big signal to judges
4. DID Integration         ← Biggest architectural addition, highest reward
5. ONS (.one names)        ← Polish layer, strong UX differentiator
```

---

## Resources

- OneChain Developer Docs: https://docs.onelabs.cc/DevelopmentDocument
- OneBox Developer Toolkit: https://onebox.onelabs.cc/chat
- OneHack 3.0: https://onehackathon.com/
- Submission deadline: **March 16, 2026 (Judging Period)**
- Winners announced: **March 18, 2026**
