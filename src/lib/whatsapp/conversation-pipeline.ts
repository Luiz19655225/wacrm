import { findExistingContact, isUniqueViolation } from '@/lib/contacts/dedupe'
import { supabaseAdmin } from './admin-client'

// Extracted from src/app/api/whatsapp/webhook/route.ts (Meta webhook) so
// the Evolution webhook can reuse the exact same contact/conversation
// resolution instead of duplicating it. The Meta call site passes
// `connectionId: null` explicitly, which preserves today's behavior
// byte-for-byte — see migration 030_evolution_connections.sql for why
// `connection_id` exists at all (without it, two providers on the same
// account would collide their messages into one conversation thread).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContactRow = any

export interface ContactOutcome {
  contact: ContactRow
  /** True when this call created the row; drives new_contact_created
   *  automation dispatch in the caller's webhook processor. */
  wasCreated: boolean
}

export async function findOrCreateContact(
  accountId: string,
  configOwnerUserId: string,
  phone: string,
  name: string
): Promise<ContactOutcome | null> {
  // Find an existing contact for this account by phone. The shared
  // helper pre-filters in SQL by the last-8-digit suffix (so we don't
  // pull every contact on every inbound message) then applies the
  // strict `phonesMatch` in JS on the small candidate set. The same
  // helper backs the manual contact form and CSV import, so all three
  // paths agree on what "same number" means (issue #212).
  const existingContact = await findExistingContact(
    supabaseAdmin(),
    accountId,
    phone,
  )

  if (existingContact) {
    // Update name if it changed
    if (name && name !== existingContact.name) {
      await supabaseAdmin()
        .from('contacts')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', existingContact.id)
    }
    return { contact: existingContact, wasCreated: false }
  }

  // Create new contact. account_id is the tenancy column;
  // user_id is the NOT NULL FK audit column (no inbound message
  // has a single "user who created" it — we attribute to the
  // config/connection owner as a stable default).
  const { data: newContact, error: createError } = await supabaseAdmin()
    .from('contacts')
    .insert({
      account_id: accountId,
      user_id: configOwnerUserId,
      phone,
      name: name || phone,
    })
    .select()
    .single()

  if (createError) {
    // Lost a race: a concurrent inbound delivery (or another path)
    // created this contact between our lookup and insert, and the
    // unique index (migration 022) rejected the duplicate. Re-resolve
    // the existing row instead of dropping the message.
    if (isUniqueViolation(createError)) {
      const raced = await findExistingContact(supabaseAdmin(), accountId, phone)
      if (raced) return { contact: raced, wasCreated: false }
    }
    console.error('Error creating contact:', createError)
    return null
  }

  return { contact: newContact, wasCreated: true }
}

export async function findOrCreateConversation(
  accountId: string,
  configOwnerUserId: string,
  contactId: string,
  // Channel this conversation belongs to. `null` for the Meta path
  // (today's only provider — every existing conversation row has
  // connection_id = NULL, so filtering on `.is('connection_id', null)`
  // reproduces the exact same single-row-per-contact lookup that ran
  // before this parameter existed). A real account_connections id for
  // Evolution (or any future provider), so the same contact can have
  // one conversation thread per channel instead of colliding into one.
  connectionId: string | null,
) {
  // Look for existing conversation in this account, scoped to this
  // channel. Same account_id + contact_id + connection_id combination
  // every time, never a bare account_id + contact_id lookup — that's
  // what would let two providers merge their messages into one thread.
  let query = supabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)

  query = connectionId === null
    ? query.is('connection_id', null)
    : query.eq('connection_id', connectionId)

  const { data: existing, error: findError } = await query.single()

  if (!findError && existing) {
    return existing
  }

  // Create new conversation. Same tenancy + audit split as
  // findOrCreateContact above.
  const { data: newConv, error: createError } = await supabaseAdmin()
    .from('conversations')
    .insert({
      account_id: accountId,
      user_id: configOwnerUserId,
      contact_id: contactId,
      connection_id: connectionId,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating conversation:', createError)
    return null
  }

  return newConv
}
