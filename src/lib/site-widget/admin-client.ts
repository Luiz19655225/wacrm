import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy, shared service-role client for the public site-widget endpoint.
// Mirrors src/lib/automations/admin-client.ts / src/lib/ai/admin-client.ts
// — same shape so anyone reading either file picks up the convention
// immediately. Needed here specifically because the widget endpoint has
// no authenticated session (the visitor isn't a WAVON user) to run
// queries under RLS with.
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
