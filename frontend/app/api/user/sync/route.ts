import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role key — server-side only, bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      return NextResponse.json({ user: existing, created: false })
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({ id: address, private_key: null, wallet_address: null })
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
