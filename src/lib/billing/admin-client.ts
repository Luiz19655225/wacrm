import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy, shared service-role client for the billing layer (Asaas
// webhook handler). Mirrors src/lib/automations/admin-client.ts and
// src/lib/flows/admin-client.ts — same shape so anyone reading any
// of the three picks up the convention immediately. Needed here
// because the webhook request carries no Supabase session — there
// is no end-user to scope an RLS-bound client to.
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
