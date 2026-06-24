import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'
import { verifyOpenAIKey } from '@/lib/ai/openai-client'

const DEFAULT_MODEL = 'gpt-4o-mini'

/** Mirrors the resolveAccountId helper in /api/whatsapp/config/route.ts. */
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

function maskKey(last4: string | null): string | null {
  return last4 ? `sk-...${last4}` : null
}

/**
 * GET /api/ai/config
 *
 * Reads the saved (non-secret) state only — no live OpenAI call, so
 * loading the settings page never burns a request against the
 * account's key. "Testar conexão" is a separate POST below.
 */
export async function GET() {
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

    const { data, error } = await supabase
      .from('ai_settings')
      .select('api_key_last4, default_model, custom_system_prompt, connection_status, last_tested_at, last_error')
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) {
      console.error('[ai/config GET] db error:', error)
      return NextResponse.json({ error: 'Falha ao carregar configuração' }, { status: 500 })
    }

    return NextResponse.json({
      configured: !!data?.api_key_last4,
      masked_key: maskKey(data?.api_key_last4 ?? null),
      default_model: data?.default_model || DEFAULT_MODEL,
      custom_system_prompt: data?.custom_system_prompt ?? null,
      connection_status: data?.connection_status || 'not_configured',
      last_tested_at: data?.last_tested_at ?? null,
      last_error: data?.last_error ?? null,
    })
  } catch (error) {
    console.error('Error in /api/ai/config GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ai/config
 *
 * Saves the account's own OpenAI key + preferences. `api_key` is
 * optional on this request — omit it (or send an empty string) to
 * update only `default_model` / `custom_system_prompt` while leaving
 * the previously saved key untouched, same UX as the WhatsApp config
 * form's masked-token re-entry pattern.
 */
export async function POST(request: Request) {
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

    const body = await request.json()
    const apiKey: string | undefined = body.api_key?.trim() || undefined
    const defaultModel: string = body.default_model?.trim() || DEFAULT_MODEL
    const customSystemPrompt: string | null = body.custom_system_prompt?.trim() || null

    const updates: Record<string, unknown> = {
      account_id: accountId,
      default_model: defaultModel,
      custom_system_prompt: customSystemPrompt,
      updated_at: new Date().toISOString(),
    }

    if (apiKey) {
      // Validate against OpenAI before persisting anything — never
      // save a key we haven't confirmed actually authenticates.
      const probe = await verifyOpenAIKey(apiKey)
      if (!probe.ok) {
        return NextResponse.json(
          { error: `Chave da OpenAI inválida: ${probe.error}` },
          { status: 400 },
        )
      }

      let encrypted: string
      try {
        encrypted = encrypt(apiKey)
      } catch (err) {
        console.error('[ai/config POST] encryption failed:', err)
        return NextResponse.json(
          { error: 'Falha ao criptografar a chave. Verifique a configuração de ENCRYPTION_KEY.' },
          { status: 500 },
        )
      }

      updates.api_key_encrypted = encrypted
      updates.api_key_last4 = apiKey.slice(-4)
      updates.connection_status = 'connected'
      updates.last_tested_at = new Date().toISOString()
      updates.last_error = null
    }

    const { data: existing } = await supabase
      .from('ai_settings')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    const { error: saveError } = existing
      ? await supabase.from('ai_settings').update(updates).eq('account_id', accountId)
      : await supabase.from('ai_settings').insert(updates)

    if (saveError) {
      console.error('[ai/config POST] save failed:', saveError)
      return NextResponse.json({ error: 'Falha ao salvar configuração' }, { status: 500 })
    }

    return NextResponse.json({ success: true, masked_key: apiKey ? maskKey(apiKey.slice(-4)) : undefined })
  } catch (error) {
    console.error('Error in /api/ai/config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/ai/config
 *
 * Removes the account's OpenAI key entirely — "Remover chave" in the
 * settings UI. Any Inbox AI action or the site widget will report the
 * feature as unconfigured afterwards (getAccountAiSettings returns null).
 */
export async function DELETE() {
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

    const { error: deleteError } = await supabase
      .from('ai_settings')
      .delete()
      .eq('account_id', accountId)

    if (deleteError) {
      console.error('[ai/config DELETE] failed:', deleteError)
      return NextResponse.json({ error: 'Falha ao remover configuração' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in /api/ai/config DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
