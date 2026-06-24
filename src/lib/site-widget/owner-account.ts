import { supabaseAdmin } from './admin-client'

// ------------------------------------------------------------
// The site widget lives on WAVON's OWN public marketing site, not as
// a per-customer embeddable product — so there's exactly one "owner"
// account whose Inbox/Pipeline/AI settings the widget feeds into,
// configured once via SITE_WIDGET_ACCOUNT_ID. This is intentionally
// NOT a database row (no per-domain config table) — widening this to
// a real multi-tenant embed is a future phase, not this one.
// ------------------------------------------------------------

export function resolveSiteWidgetAccountId(): string | null {
  return process.env.SITE_WIDGET_ACCOUNT_ID || null
}

/**
 * Stable "sender of record" for inserts that need a NOT NULL user_id
 * FK (contacts, conversations) — same role as the WhatsApp config
 * owner on the Meta/Evolution paths. accounts.owner_user_id is
 * denormalised exactly for this (migration 017_account_sharing.sql).
 */
export async function resolveAccountOwnerUserId(accountId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('accounts')
    .select('owner_user_id')
    .eq('id', accountId)
    .single()
  if (error || !data) return null
  return data.owner_user_id as string
}

/**
 * Returns the account's SITE_WIDGET account_connections row, creating
 * it on first use. `is_primary: false` so it never competes with the
 * account's real WhatsApp connection (migration 028's unique index
 * only allows one is_primary row per account).
 *
 * Looks up with `order + limit(1)` rather than `.maybeSingle()` — a
 * concurrent first request could race and create two rows; `.single()`
 * style lookups THROW on more than one match, which would break every
 * widget message afterwards (the same class of bug fixed earlier in
 * `/api/channels/connections` for QR Code/Meta API duplicates).
 */
export async function getOrCreateSiteWidgetConnectionId(accountId: string): Promise<string> {
  const db = supabaseAdmin()

  const { data: existing, error: findError } = await db
    .from('account_connections')
    .select('id')
    .eq('account_id', accountId)
    .eq('provider', 'SITE_WIDGET')
    .order('created_at', { ascending: true })
    .limit(1)

  if (findError) {
    throw new Error(`Falha ao buscar conexão do widget do site: ${findError.message}`)
  }
  if (existing && existing.length > 0) return existing[0].id as string

  const { data: created, error: createError } = await db
    .from('account_connections')
    .insert({
      account_id: accountId,
      connection_type: 'SITE_WIDGET',
      provider: 'SITE_WIDGET',
      connection_status: 'connected',
      label: 'Atendente IA do site',
      is_primary: false,
      connected_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (createError || !created) {
    throw new Error(`Falha ao criar conexão do widget do site: ${createError?.message}`)
  }
  return created.id as string
}
