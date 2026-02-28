import type { Node, Edge } from 'reactflow'
import { createNode, generateNodeId } from './workflow-utils'

// Map AI tool types to our in-app tool types
const toolTypeMap: Record<string, string> = {
  transfer: 'transfer',
  swap: 'swap',
  get_balance: 'get_balance',
  stt_balance_fetch: 'get_balance',
  balance: 'get_balance',
  // Move / OneChain-specific tool names returned by AI backend
  deploy_move_token: 'deploy_token',
  deploy_move_nft: 'deploy_nft_collection',
  deploy_move_nft_collection: 'deploy_nft_collection',
  mint_nft: 'deploy_nft_collection',
  deploy_move_package: 'deploy_token',
  fetch_token_price: 'fetch_price',
  get_price: 'fetch_price',
  price: 'fetch_price',
  send_email: 'send_email',
  email: 'send_email',
  // Legacy / generic names
  deploy_token: 'deploy_token',
  deploy_nft_collection: 'deploy_nft_collection',
  create_dao: 'create_dao',
  airdrop: 'airdrop',
  deposit_with_yield_prediction: 'deposit_yield',
  condition_check: 'condition_check',
  yes_no_answer: 'yes_no_answer',
  yes_no: 'yes_no_answer',
  boolean_check: 'condition_check',
  send_webhook: 'send_webhook',
  webhook: 'send_webhook',
  create_proposal: 'create_proposal',
  vote_on_proposal: 'vote_on_proposal',
  vote: 'vote_on_proposal',
  get_proposal: 'get_proposal',
  proposal_details: 'get_proposal',
}

interface AITool {
  id: string
  type: string
  name: string
  next_tools: string[]
}

interface AIResponse {
  agent_id: string
  tools: AITool[]
  has_sequential_execution: boolean
  description: string
  raw_response?: string
}

/**
 * Convert AI response format to ReactFlow nodes and edges
 */
export function aiResponseToWorkflow(aiResponse: AIResponse): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  
  // Create a map of AI tool IDs to our node IDs
  const toolIdToNodeId = new Map<string, string>()
  
  // Create nodes with proper positioning
  aiResponse.tools.forEach((tool, index) => {
    // Map AI tool type to our tool type
    const ourToolType = toolTypeMap[tool.type] || tool.type
    
    // Check if this tool type exists in our system
    const validToolTypes = [
      'transfer',
      'swap',
      'get_balance',
      'deploy_token',
      'deploy_nft_collection',
      'create_dao',
      'airdrop',
      'fetch_price',
      'deposit_yield',
      'condition_check',
      'yes_no_answer',
      'send_email',
      'send_webhook',
      'create_proposal',
      'vote_on_proposal',
      'get_proposal',
    ]
    
    if (!validToolTypes.includes(ourToolType)) {
      console.warn(`Unknown tool type from AI: ${tool.type} (mapped to: ${ourToolType})`)
      return
    }
    
    const nodeId = generateNodeId(ourToolType)
    toolIdToNodeId.set(tool.id, nodeId)
    
    // Position nodes in a grid layout
    const row = Math.floor(index / 3)
    const col = index % 3
    const position = {
      x: col * 250 + 100,
      y: row * 150 + 100,
    }
    
    const node = createNode({
      type: ourToolType,
      position,
      id: nodeId,
    })
    
    // Update label with AI-provided name if available
    if (tool.name) {
      node.data.label = tool.name
    }
    
    nodes.push(node)
  })
  
  // Create edges based on next_tools relationships
  aiResponse.tools.forEach((tool) => {
    const sourceNodeId = toolIdToNodeId.get(tool.id)
    if (!sourceNodeId) return
    
    tool.next_tools.forEach((nextToolId) => {
      const targetNodeId = toolIdToNodeId.get(nextToolId)
      if (targetNodeId) {
        edges.push({
          id: `edge-${sourceNodeId}-${targetNodeId}`,
          source: sourceNodeId,
          target: targetNodeId,
          type: 'custom',
        })
      }
    })
  })
  
  return { nodes, edges }
}

/**
 * Check if a response is a valid AI workflow response
 */
export function isValidAIWorkflowResponse(data: any): data is AIResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.tools) &&
    data.tools.length > 0 &&
    data.tools.every(
      (tool: any) =>
        tool &&
        typeof tool.id === 'string' &&
        typeof tool.type === 'string' &&
        Array.isArray(tool.next_tools)
    )
  )
}

