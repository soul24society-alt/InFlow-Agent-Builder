import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Server-side env var (not exposed to browser) — falls back to localhost for dev
    const backendUrl =
      process.env.AI_WORKFLOW_BACKEND_URL ||
      process.env.NEXT_PUBLIC_AI_WORKFLOW_BACKEND_URL ||
      'http://localhost:8001'

    const response = await fetch(`${backendUrl}/create-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[workflow proxy] backend error:', response.status, text)
      return NextResponse.json(
        { error: `Workflow backend returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[workflow proxy] fetch failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reach workflow backend' },
      { status: 502 }
    )
  }
}
