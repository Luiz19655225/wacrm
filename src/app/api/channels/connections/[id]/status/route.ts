// GET /api/channels/connections/[id]/status
//
// Live diagnostic: fetches the Evolution instance state for a QR_CODE
// connection and returns it alongside the DB status and the webhook URL
// configured on the instance. Used by the UI "Verificar" button to help
// diagnose "QR scanned but WhatsApp didn't connect" cases.

import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { fetchConnectionState } from '@/lib/whatsapp/evolution-api'

const FIELDS = 'id, account_id, connection_type, provider, connection_status, external_id'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const ctx = await requireRole('admin')

    const { data: connection, error } = await ctx.supabase
      .from('account_connections')
      .select(FIELDS)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Failed to load connection' }, { status: 500 })
    if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    if (connection.connection_type !== 'QR_CODE' || !connection.external_id) {
      return NextResponse.json(
        { error: 'Connection is not a provisioned Evolution instance' },
        { status: 400 },
      )
    }

    let evolutionState: string
    try {
      evolutionState = await fetchConnectionState(connection.external_id as string)
    } catch (err) {
      evolutionState = `error: ${err instanceof Error ? err.message : 'unknown'}`
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? ''
    const webhookUrl = `${siteUrl}/api/webhooks/evolution`

    return NextResponse.json({
      evolutionState,
      dbStatus: connection.connection_status,
      webhookUrl,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
