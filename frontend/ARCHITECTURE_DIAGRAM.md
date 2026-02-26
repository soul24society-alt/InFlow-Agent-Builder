# Backend Integration Architecture

## System Architecture Diagram.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                              USER BROWSER                                   │
│                          (React/Next.js Frontend)                           │
│                           http://localhost:3000                             │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 1. User sends message
                               │    "Deploy a token called MyToken"
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CHAT PAGE                                   │
│                   app/agent/[agentId]/chat/page.tsx                         │
│                                                                             │
│  • Gets user's private key from database (dbUser.private_key)               │
│  • Calls: sendAgentChatMessage(api_key, message, private_key)             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 2. Calls backend service
                               │    lib/backend.ts
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTE (Proxy)                               │
│                    app/api/agent/chat/route.ts                              │
│                                                                             │
│  • Validates agent API key: getAgentByApiKey(api_key)                      │
│  • Gets agent configuration from database                                   │
│  • Forwards request to AI Agent Backend                                     │
│                                                                             │
│  Request Body:                                                              │
│  {                                                                          │
│    tools: agent.tools,          // From database                           │
│    user_message: "Deploy...",   // User's message                          │
│    private_key: "0x..."         // From database                           │
│  }                                                                          │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 3. POST http://localhost:8000/agent/chat
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AI AGENT BACKEND                                      │
│                    n8n_agent_backend/main.py                                │
│                      Port 8000 (FastAPI)                                    │
│                                                                             │
│  • Uses Google Gemini 2.0 Flash for AI processing                          │
│  • Parses natural language: "Deploy a token called MyToken"                │
│  • Determines tool: deploy_token                                           │
│  • Extracts parameters:                                                     │
│    - name: "MyToken"                                                        │
│    - symbol: "MTK"                                                          │
│    - initialSupply: "1000000"                                               │
│  • Adds private key if needed                                               │
│                                                                             │
│  Tool Execution:                                                            │
│  execute_tool("deploy_token", {                                            │
│    privateKey: "0x...",                                                     │
│    name: "MyToken",                                                         │
│    symbol: "MTK",                                                           │
│    initialSupply: "1000000"                                                 │
│  })                                                                         │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 4. POST http://localhost:3000/token/deploy
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN BACKEND                                     │
│                      backend/server.js                                      │
│                    Port 3000 (Express.js)                                   │
│                                                                             │
│  • Validates request parameters                                             │
│  • Connects to OneChain Testnet RPC                                         │
│  • Creates wallet from private key                                          │
│  • Prepares transaction:                                                    │
│    - Convert name/symbol to bytes32                                         │
│    - Connect to TokenFactory contract                                       │
│    - Estimate gas                                                           │
│  • Executes blockchain transaction:                                         │
│    factory.createToken(name, symbol, decimals, supply)                     │
│  • Waits for confirmation                                                   │
│  • Returns result:                                                          │
│    {                                                                        │
│      success: true,                                                         │
│      tokenId: "0x...",                                                      │
│      transactionHash: "0x...",                                              │
│      blockNumber: 12345,                                                    │
│      gasUsed: "150000",                                                     │
│      explorerUrl: "https://sepolia.arbiscan.io/tx/0x..."                   │
│    }                                                                        │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 5. Transaction sent to blockchain
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ARBITRUM SEPOLIA BLOCKCHAIN                            │
│                                                                             │
│  • Mines transaction                                                        │
│  • Executes Stylus smart contract                                          │
│  • Creates token with unique ID                                             │
│  • Emits events                                                             │
│  • Transaction visible on: https://sepolia.arbiscan.io                     │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 6. Response flows back
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AI AGENT BACKEND                                       │
│                                                                             │
│  • Receives blockchain result                                               │
│  • Sends result back to Gemini AI                                          │
│  • AI generates human-friendly response:                                    │
│    "I've successfully deployed your token MyToken (MTK)                     │
│     with 1 million initial supply. The token ID is 0x123...                │
│     Transaction: 0xabc... View on explorer: [link]"                        │
│                                                                             │
│  Final Response:                                                            │
│  {                                                                          │
│    agent_response: "I've successfully deployed...",                         │
│    tool_calls: [{ tool: "deploy_token", parameters: {...} }],             │
│    results: [{ success: true, tool: "deploy_token", result: {...} }]      │
│  }                                                                          │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 7. Response sent back
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTE                                       │
│                                                                             │
│  • Receives response from AI Agent Backend                                  │
│  • Returns to frontend                                                      │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               │ 8. Response displayed
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CHAT PAGE                                   │
│                                                                             │
│  • Displays AI-generated response                                           │
│  • Shows transaction hash with explorer link                                │
│  • Displays tool execution details                                          │
│  • Shows token information                                                  │
│  • Removes private keys from display for security                           │
│                                                                             │
│  User sees:                                                                 │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │ 🤖 AI Agent                                             │              │
│  │                                                         │              │
│  │ I've successfully deployed your token MyToken (MTK)    │              │
│  │ with 1 million initial supply.                         │              │
│  │                                                         │              │
│  │ Token ID: 0x123...                                     │              │
│  │ Transaction: 0xabc... [View on Explorer]              │              │
│  │                                                         │              │
│  │ ✅ Deploy ERC20 - Success                              │              │
│  │ Gas Used: 150000                                       │              │
│  └─────────────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Frontend (Next.js - Port 3000/3001)
- **Chat UI**: User interface for interacting with agents
- **API Route**: Proxy between frontend and AI backend
- **Backend Service**: Utilities for API calls
- **Database**: Supabase for storing users, agents, API keys

### 2. AI Agent Backend (FastAPI - Port 8000)
- **AI Processing**: Google Gemini for natural language understanding
- **Tool Orchestration**: Determines which blockchain tools to call
- **Parameter Extraction**: Extracts parameters from natural language
- **Sequential Execution**: Supports chaining multiple operations

### 3. Blockchain Backend (Express - Port 3000)
- **Blockchain Interface**: Direct interaction with OneChain Testnet
- **Smart Contract Calls**: Executes token factory and NFT operations
- **Transaction Management**: Handles gas estimation and confirmations
- **Result Formatting**: Returns standardized responses

### 4. Blockchain Layer
- **OneChain Testnet**: Testnet blockchain
- **Stylus Contracts**: Rust-based smart contracts
- **Explorer**: Transaction verification and tracking

## Data Flow Summary

1. **User Input** → Natural language message
2. **Frontend** → Retrieves private key from DB, calls API
3. **API Route** → Validates API key, forwards to AI backend
4. **AI Backend** → Parses message, calls blockchain backend
5. **Blockchain Backend** → Executes transaction on chain
6. **Blockchain** → Confirms transaction
7. **Response** → Flows back through all layers
8. **Display** → User sees friendly response + transaction details

## Security Layers

```
Private Key Storage:
┌─────────────────────────────────────────────────┐
│ Supabase Database (Encrypted at Rest)          │
│  • User's private key stored securely           │
│  • Only accessible by authenticated user         │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│ Next.js API Route (Server-side)                │
│  • Validates API key before accessing DB        │
│  • Retrieves private key server-side only       │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│ HTTPS/TLS (In Production)                      │
│  • Private key transmitted securely             │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│ Backend Processing                              │
│  • Used only for transaction signing            │
│  • Never logged or stored elsewhere             │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│ Response Sanitization                           │
│  • Private keys removed from responses          │
│  • Never displayed in frontend UI               │
└─────────────────────────────────────────────────┘
```

## Environment Variables

```
Frontend (.env.local):
├─ NEXT_PUBLIC_SUPABASE_URL          → Database connection
├─ NEXT_PUBLIC_SUPABASE_ANON_KEY     → Database auth
├─ NEXT_PUBLIC_PRIVY_APP_ID          → User authentication
├─ NEXT_PUBLIC_AI_AGENT_BACKEND_URL  → AI backend URL (port 8000)
└─ NEXT_PUBLIC_BLOCKCHAIN_BACKEND_URL → Blockchain backend URL (port 3000)

AI Agent Backend (.env):
├─ GEMINI_API_KEY                    → Google AI API key
└─ BACKEND_URL                       → Blockchain backend URL

Blockchain Backend (.env):
├─ TOKEN_FACTORY_ADDRESS             → Token factory contract
├─ NFT_FACTORY_ADDRESS               → NFT factory contract
└─ GEMINI_API_KEY                    → For price fetching feature
```

## Available Tools

The system supports these blockchain operations:

| Tool | Backend Route | Blockchain Operation |
|------|--------------|---------------------|
| deploy_token | POST /token/deploy | Deploy ERC20 token via TokenFactory |
| deploy_nft_collection | POST /nft/deploy-collection | Deploy ERC721 collection via NFTFactory |
| transfer | POST /transfer | Transfer ETH or ERC20 tokens |
| get_balance | GET /transfer/balance/:address | Query ETH balance |
| get_token_balance | GET /token/balance/:id/:address | Query ERC20 balance |
| get_token_info | GET /token/info/:id | Get token metadata |
| mint_nft | POST /nft/mint | Mint new NFT in collection |
| get_nft_info | GET /nft/info/:collection/:id | Get NFT metadata |
| fetch_price | POST /price/token | Get crypto price (AI-powered) |

## Error Handling Flow

```
Error at any layer:
┌─────────────────┐
│ Blockchain      │ → Transaction failed
└────────┬────────┘
         │ { success: false, error: "Insufficient gas" }
         ↓
┌─────────────────┐
│ Blockchain      │ → Returns error to AI backend
│ Backend         │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ AI Agent        │ → AI interprets error, creates friendly message
│ Backend         │
└────────┬────────┘
         │ { agent_response: "Transaction failed due to insufficient gas..." }
         ↓
┌─────────────────┐
│ API Route       │ → Returns error response
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Frontend        │ → Displays error to user with suggested actions
└─────────────────┘
```

This architecture ensures:
- ✅ Clean separation of concerns
- ✅ Type safety across all layers
- ✅ Secure private key handling
- ✅ Graceful error handling
- ✅ Scalable and maintainable code

Note: Updated on 2026-01-28 13:00 IST for historical commit demonstration.
