import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

// Service role key — server-side only, bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateAgentWallet(): { address: string; privateKey: string } {
  const keypair = Ed25519Keypair.generate()
  return {
    address: keypair.toSuiAddress(),
    privateKey: keypair.getSecretKey(), // base64-encoded 64-byte secret
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    // Try to fetch existing user
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', address)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: fetchError.message, code: fetchError.code },
        { status: 500 }
      )
    }

    if (existing) {
      // Auto-provision agent wallet for existing users who don't have one yet
      if (!existing.private_key) {
        const agentWallet = generateAgentWallet()
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ private_key: agentWallet.privateKey, wallet_address: agentWallet.address })
          .eq('id', address)
          .select()
          .single()

        if (updateError) {
          // Non-fatal — return user as-is, they can set up manually
          return NextResponse.json({ user: existing, created: false })
        }

        return NextResponse.json({ user: updatedUser, created: false })
      }

      return NextResponse.json({ user: existing, created: false })
    }

    // Create new user with auto-generated agent wallet
    const agentWallet = generateAgentWallet()
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({ id: address, private_key: agentWallet.privateKey, wallet_address: agentWallet.address })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { error: createError.message, code: createError.code, details: createError.details },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: newUser, created: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
