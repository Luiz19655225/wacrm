import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'

/**
 * GET /api/observabilidade/integrations
 * Returns status for Google Calendar, Evolution API, and Cron.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [calResult, evoResult, reminderResult] = await Promise.all([
      supabaseAdmin()
        .from('calendar_settings')
        .select('provider_type, timezone, is_enabled, connected_at')
        .eq('account_id', accountId)
        .maybeSingle(),

      supabaseAdmin()
        .from('account_connections')
        .select('provider, connection_status, external_id, updated_at')
        .eq('account_id', accountId)
        .eq('provider', 'EVOLUTION')
        .maybeSingle(),

      supabaseAdmin()
        .from('appointment_comm_log')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('event_type', 'reminder_sent')
        .gte('created_at', since24h),
    ])

    const cal = calResult.data
    const evo = evoResult.data
    const reminderCount = reminderResult.count ?? 0

    return NextResponse.json({
      googleCalendar: cal
        ? {
            connected: cal.is_enabled === true,
            provider: cal.provider_type as string,
            timezone: cal.timezone as string | null,
            connectedAt: cal.connected_at as string | null,
          }
        : { connected: false, provider: null, timezone: null, connectedAt: null },

      evolutionApi: evo
        ? {
            connected: (evo.connection_status as string) === 'connected',
            instanceName: evo.external_id as string | null,
            connectionStatus: evo.connection_status as string,
            updatedAt: evo.updated_at as string | null,
          }
        : { connected: false, instanceName: null, connectionStatus: 'not_configured', updatedAt: null },

      cron: {
        configured: !!(process.env.AUTOMATION_CRON_SECRET),
        remindersLast24h: reminderCount,
      },
    })
  } catch (err) {
    console.error('[observabilidade/integrations GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
