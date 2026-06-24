import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import { verifyOpenAIKey } from '@/lib/ai/openai-client'
import { logAiUsage } from '@/lib/ai/ai-settings'

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return data.account_id as string
}

/**
 * POST /api/ai/config/test
 *
 * "Testar conexão" — re-validates the already-saved key against
 * OpenAI live (no body needed) and persists the result so the
 * settings panel and any future Inbox AI call can show an up-to-date
 * status without re-testing on every page load.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        { error: 'Seu perfil não está vinculado a uma conta.' },
        { status: 403 },
      )
    }

    const { data: settings, error: fetchError } = await supabase
      .from('ai_settings')
      .select('api_key_encrypted')
      .eq('account_id', accountId)
      .maybeSingle()

    if (fetchError || !settings?.api_key_encrypted) {
      return NextResponse.json(
        { connected: false, error: 'Nenhuma chave da OpenAI salva ainda.' },
        { status: 200 },
      )
    }

    let apiKey: string
    try {
      apiKey = decrypt(settings.api_key_encrypted as string)
    } catch (err) {
      console.error('[ai/config/test] decrypt failed:', err)
      await supabase
        .from('ai_settings')
        .update({ connection_status: 'error', last_error: 'Chave corrompida — salve novamente.', last_tested_at: new Date().toISOString() })
        .eq('account_id', accountId)
      return NextResponse.json(
        { connected: false, error: 'A chave salva não pôde ser lida. Salve novamente.' },
        { status: 200 },
      )
    }

    const probe = await verifyOpenAIKey(apiKey)

    await supabase
      .from('ai_settings')
      .update({
        connection_status: probe.ok ? 'connected' : 'error',
        last_error: probe.ok ? null : probe.error,
        last_tested_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)

    await logAiUsage({
      accountId,
      feature: 'connection_test',
      status: probe.ok ? 'success' : 'error',
      errorMessage: probe.ok ? null : probe.error,
    })

    if (!probe.ok) {
      return NextResponse.json({ connected: false, error: probe.error }, { status: 200 })
    }
    return NextResponse.json({ connected: true })
  } catch (error) {
    console.error('Error in /api/ai/config/test POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
