export interface AgentTemplate {
  id: string
  name: string
  description: string
  emoji: string
  category: "gamefi" | "defi" | "automation"
  tools: Array<{ tool: string; next_tool: string | null }>
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "nft-badge-agent",
    name: "NFT Badge Agent",
    description:
      "Check player balance, mint an achievement badge NFT, send an OCT reward, and notify by email.",
    emoji: "🏆",
    category: "gamefi",
    tools: [
      { tool: "get_balance", next_tool: "condition_check" },
      { tool: "condition_check", next_tool: "mint_nft" },
      { tool: "mint_nft", next_tool: "transfer" },
      { tool: "transfer", next_tool: "send_email" },
      { tool: "send_email", next_tool: null },
    ],
  },
  {
    id: "p2e-reward-distributor",
    name: "P2E Reward Distributor",
    description:
      "Fetch live OCT price, batch airdrop rewards to top players, and send a confirmation email.",
    emoji: "🎮",
    category: "gamefi",
    tools: [
      { tool: "fetch_price", next_tool: "airdrop" },
      { tool: "airdrop", next_tool: "send_email" },
      { tool: "send_email", next_tool: null },
    ],
  },
  {
    id: "token-gated-access",
    name: "Token Gated Access",
    description:
      "Verify a player's token balance, evaluate the access condition, and webhook the result to your game server.",
    emoji: "🔐",
    category: "gamefi",
    tools: [
      { tool: "get_balance", next_tool: "condition_check" },
      { tool: "condition_check", next_tool: "yes_no_answer" },
      { tool: "yes_no_answer", next_tool: "send_webhook" },
      { tool: "send_webhook", next_tool: null },
    ],
  },
  {
    id: "dao-governance-agent",
    name: "DAO Governance Agent",
    description:
      "Create an on-chain DAO, submit a governance proposal, and notify stakeholders by email.",
    emoji: "🗳️",
    category: "automation",
    tools: [
      { tool: "create_dao", next_tool: "create_proposal" },
      { tool: "create_proposal", next_tool: "send_email" },
      { tool: "send_email", next_tool: null },
    ],
  },
  {
    id: "token-deploy-notify",
    name: "Token Launch Agent",
    description:
      "Deploy a Move fungible token, fetch its live price, airdrop to an early-access list, and send notifications.",
    emoji: "🚀",
    category: "defi",
    tools: [
      { tool: "deploy_token", next_tool: "fetch_price" },
      { tool: "fetch_price", next_tool: "airdrop" },
      { tool: "airdrop", next_tool: "send_email" },
      { tool: "send_email", next_tool: null },
    ],
  },
  {
    id: "nft-collection-launcher",
    name: "NFT Collection Launcher",
    description:
      "Deploy a new NFT collection, mint the first batch to a list of wallets, and fire a webhook to your storefront.",
    emoji: "🎨",
    category: "gamefi",
    tools: [
      { tool: "deploy_nft_collection", next_tool: "mint_nft" },
      { tool: "mint_nft", next_tool: "send_webhook" },
      { tool: "send_webhook", next_tool: null },
    ],
  },
  {
    id: "usdo-stable-rewards",
    name: "USDO Stable Rewards",
    description:
      "Check a wallet's USDO balance, verify it meets a threshold, then batch-airdrop USDO stablecoin rewards and confirm by email.",
    emoji: "💵",
    category: "defi",
    tools: [
      { tool: "get_usdo_balance", next_tool: "condition_check" },
      { tool: "condition_check", next_tool: "airdrop" },
      { tool: "airdrop", next_tool: "send_email" },
      { tool: "send_email", next_tool: null },
    ],
  },
]

export const CATEGORY_LABELS: Record<AgentTemplate["category"], string> = {
  gamefi: "GameFi",
  defi: "DeFi",
  automation: "Automation",
}
