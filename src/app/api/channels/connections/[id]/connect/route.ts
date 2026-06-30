// ============================================================
// /api/channels/connections/[id]/connect
//
//   POST — provision a real Evolution instance for an existing
//   QR_CODE/EVOLUTION connection row and start the QR pairing
//   process. Admin+.
//
// This is the Fase 3 line that actually drives a provider, unlike
// the Fase 1 placeholder POST on /api/channels/connections (which
// only ever wrote a 'pending' row). The QR code itself is treated as
// arriving via the qrcode.updated webhook event
// (src/lib/whatsapp/evolution-webhook-processor.ts) — a synchronous
// QR in this response is a bonus fast-path, never relied upon.
// ============================================================

import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { getChannelAdapter } from '@/lib/channels/registry'
import type { AccountConnection } from '@/types'

const CONNECTION_FIELDS =
  'id, account_id, connection_type, provider, connection_status, label, is_primary, phone_number, external_id, meta_waba_id, meta_phone_number_id, metadata, connected_at, last_error, created_at, updated_at'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const ctx = await requireRole('admin')

    const limit = checkRateLimit(`channels:connect:${ctx.userId}`, RATE_LIMITS.adminAction)
    if (!limit.success) return rateLimitResponse(limit)

    const { data: connection, error: fetchError } = await ctx.supabase
      .from('account_connections')
      .select(CONNECTION_FIELDS)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle()

    if (fetchError) {
      console.error('[POST /api/channels/connections/[id]/connect] fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to load connection' }, { status: 500 })
    }
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }
    if (connection.connection_type !== 'QR_CODE' || connection.provider !== 'EVOLUTION') {
      return NextResponse.json(
        { error: 'Only QR_CODE/EVOLUTION connections can be provisioned through this endpoint' },
        { status: 400 },
      )
    }
    if (connection.connection_status === 'connected') {
      return NextResponse.json({ connection, alreadyConnected: true })
    }

    // Remove any other QR_CODE rows for this account before provisioning.
    // Evolution maps instanceName = accountId (1:1), so more than one
    // QR_CODE row is always a stale duplicate. Clicking "Tentar novamente"
    // on any card converges the account back to a single row.
    const { data: otherRows } = await ctx.supabase
      .from('account_connections')
      .select('id')
      .eq('account_id', ctx.accountId)
      .eq('connection_type', 'QR_CODE')
      .neq('id', id)

    if (otherRows && otherRows.length > 0) {
      const staleIds = otherRows.map((r: Record<string, unknown>) => r.id as string)
      const { error: cleanupErr } = await ctx.supabase
        .from('account_connections')
        .delete()
        .in('id', staleIds)
        .eq('account_id', ctx.accountId)
      if (cleanupErr) {
        console.warn('[POST /api/channels/connections/[id]/connect] duplicate QR_CODE cleanup failed:', cleanupErr)
      } else if (staleIds.length > 0) {
        console.info(
          `[POST /api/channels/connections/[id]/connect] purged ${staleIds.length} duplicate QR_CODE rows for account ${ctx.accountId}`,
        )
      }
    }

    let qrcodeBase64: string | null
    try {
      const result = await getChannelAdapter('EVOLUTION').connect(connection as unknown as AccountConnection)
      qrcodeBase64 = result.qrcodeBase64
    } catch (err) {
      console.error('[POST /api/channels/connections/[id]/connect] Evolution connect() failed:', err)
      await ctx.supabase
        .from('account_connections')
        .update({
          connection_status: 'error',
          last_error: err instanceof Error ? err.message : 'Failed to create Evolution instance',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      return NextResponse.json({
        error: 'Failed to provision Evolution instance',
        details: err instanceof Error ? err.message : 'Unknown error',
      }, { status: 502 })
    }

    const metadata = {
      ...(connection.metadata as Record<string, unknown> | null ?? {}),
      ...(qrcodeBase64 ? { qrcode_base64: qrcodeBase64 } : {}),
    }

    const { data: updated, error: updateError } = await ctx.supabase
      .from('account_connections')
      .update({
        external_id: ctx.accountId,
        connection_status: 'qrcode_ready',
        last_error: null,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(CONNECTION_FIELDS)
      .single()

    if (updateError) {
      console.error('[POST /api/channels/connections/[id]/connect] update error:', updateError)
      return NextResponse.json({ error: 'Instance created but failed to persist state' }, { status: 500 })
    }

    return NextResponse.json({ connection: updated })
  } catch (err) {
    return toErrorResponse(err)
  }
}
