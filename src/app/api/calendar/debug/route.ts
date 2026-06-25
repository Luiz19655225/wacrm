import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/calendar/debug
 *
 * Diagnostic endpoint — returns ONLY boolean presence flags, never secret values.
 * Remove this file after diagnosis is complete.
 */
export async function GET() {
  // Require authentication — only logged-in users can call this
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const g_id     = process.env.GOOGLE_CLIENT_ID
  const g_secret = process.env.GOOGLE_CLIENT_SECRET
  const g_redir  = process.env.GOOGLE_REDIRECT_URI
  const app_url  = process.env.NEXT_PUBLIC_APP_URL

  return NextResponse.json({
    runtime: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID:     { present: !!g_id,     length: g_id?.length ?? 0 },
    GOOGLE_CLIENT_SECRET: { present: !!g_secret, length: g_secret?.length ?? 0 },
    GOOGLE_REDIRECT_URI:  { present: !!g_redir,  length: g_redir?.length ?? 0 },
    NEXT_PUBLIC_APP_URL:  { present: !!app_url,  value: app_url ?? null },
  })
}
