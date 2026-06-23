// ============================================================
// /api/channels/connections/[id]
//
//   DELETE — disconnect/remove a connection. Admin+.
//
// For EVOLUTION connections, this calls Evolution's delete-instance
// endpoint first (best effort — logged, not fatal, if the instance is
// already gone on Evolution's side) and then removes the row, freeing
// the account to start over with a fresh "Add QR Code connection".
// ============================================================

import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { getChannelAdapter } from '@/lib/channels/registry'
import type { AccountConnection, ChannelProvider } from '@/types'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const ctx = await requireRole('admin')

    const limit = checkRateLimit(`channels:disconnect:${ctx.userId}`, RATE_LIMITS.adminAction)
    if (!limit.success) return rateLimitResponse(limit)

    const { data: connection, error: fetchError } = await ctx.supabase
      .from('account_connections')
      .select('id, account_id, provider, external_id')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle()

    if (fetchError) {
      console.error('[DELETE /api/channels/connections/[id]] fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to load connection' }, { status: 500 })
    }
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    try {
      await getChannelAdapter(connection.provider as ChannelProvider).disconnect(
        connection as unknown as AccountConnection,
      )
    } catch (err) {
      console.warn(
        '[DELETE /api/channels/connections/[id]] adapter disconnect() failed (continuing with row removal):',
        err,
      )
    }

    const { error: deleteError } = await ctx.supabase
      .from('account_connections')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[DELETE /api/channels/connections/[id]] delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove connection' }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
