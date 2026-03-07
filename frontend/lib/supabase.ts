import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey
  })
  throw new Error('Missing Supabase environment variables')
}

console.log('Supabase initialized with URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface User {
  id: string // Sui wallet address (from useCurrentAccount → account.address)
  private_key: string | null
  wallet_address: string | null
  did: string | null // OneChain 13-digit DID number
  ons_name: string | null // OneChain Name Service — e.g. "alice.one"
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  user_id: string
  name: string
  description: string | null
  api_key: string
  gas_budget: number | null
  is_public: boolean
  tools: Array<{
    tool: string
    next_tool: string | null
    config?: Record<string, any>
  }>
  created_at: string
  updated_at: string
}

