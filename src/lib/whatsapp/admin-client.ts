import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy, shared service-role client for the WhatsApp layer (Meta and
// Evolution webhook handlers, conversation pipeline). Mirrors
// src/lib/billing/admin-client.ts, src/lib/automations/admin-client.ts
// and src/lib/flows/admin-client.ts — same shape so anyone reading any
// of the four picks up the convention immediately. Needed here because
// webhook requests carry no Supabase session — there is no end-user to
// scope an RLS-bound client to.
let _adminClient: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}
