// ============================================================
// POST /api/whatsapp/embedded-signup/exchange
//
// Receives the one-time authorization code from Meta Embedded
// Signup (fired by the FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING
// event on the frontend), exchanges it for an access token
// server-side, persists credentials encrypted in both
// account_connections (adapter path) and whatsapp_config
// (webhook pipeline path), and subscribes WABA webhook fields.
//
// Returns a controlled response — no tokens, no secrets — just
// enough for the UI to confirm the connection is live.
//
// Body: { code, waba_id, phone_number_id, organization_id }
//   code             — one-time auth code from the FB SDK
//   waba_id          — from session_info.waba_id
//   phone_number_id  — from session_info.phone_number_id
//   organization_id  — Meta Business Portfolio ID (optional)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentAccount,
  toErrorResponse,
} from '@/lib/auth/account';
import { encrypt } from '@/lib/whatsapp/encryption';
import {
  exchangeCodeForToken,
  getPhoneNumbers,
  subscribeWebhookFields,
  startHistorySync,
  startContactsSync,
} from '@/lib/whatsapp/meta-api';

interface ExchangeBody {
  code: string;
  waba_id: string;
  phone_number_id?: string;
  organization_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();

    const body = (await req.json()) as ExchangeBody;
    const { code, waba_id, phone_number_id: bodyPhoneNumberId, organization_id } = body;

    if (!code || !waba_id) {
      return NextResponse.json(
        { error: 'code and waba_id are required' },
        { status: 400 },
      );
    }

    // ── 1. Exchange code for access token (server-side only) ──
    const { accessToken } = await exchangeCodeForToken({ code });

    // ── 2. Resolve phone_number_id ────────────────────────────
    // The frontend sends it from session_info. If missing, fetch
    // from Meta (picks the first number under the WABA).
    let phoneNumberId = bodyPhoneNumberId;
    let displayPhoneNumber: string | undefined;
    if (!phoneNumberId) {
      const numbers = await getPhoneNumbers({ wabaId: waba_id, accessToken });
      if (!numbers.length) {
        return NextResponse.json(
          { error: 'No phone numbers found under the provided WABA' },
          { status: 422 },
        );
      }
      phoneNumberId = numbers[0].id;
      displayPhoneNumber = numbers[0].display_phone_number;
    }

    // ── 3. Encrypt credentials ────────────────────────────────
    const credentialsJson = JSON.stringify({ accessToken });
    const credentialsEncrypted = encrypt(credentialsJson);
    const tokenEncrypted = encrypt(accessToken);

    // ── 4. Persist to account_connections ────────────────────
    const { data: connection, error: connError } = await ctx.supabase
      .from('account_connections')
      .upsert(
        {
          account_id: ctx.accountId,
          connection_type: 'META_EMBEDDED',
          provider: 'META_EMBEDDED',
          connection_status: 'connected',
          label: 'WhatsApp (Meta Embedded Signup)',
          is_primary: false,
          meta_waba_id: waba_id,
          meta_phone_number_id: phoneNumberId,
          phone_number: displayPhoneNumber ?? null,
          credentials_encrypted: credentialsEncrypted,
          metadata: organization_id ? { organization_id } : {},
          connected_at: new Date().toISOString(),
        },
        {
          onConflict: 'account_id,meta_phone_number_id',
          ignoreDuplicates: false,
        },
      )
      .select('id')
      .single();

    if (connError) {
      // Fall back to insert without conflict resolution if the unique
      // index does not exist yet (migration pending).
      const { data: inserted, error: insertError } = await ctx.supabase
        .from('account_connections')
        .insert({
          account_id: ctx.accountId,
          connection_type: 'META_EMBEDDED',
          provider: 'META_EMBEDDED',
          connection_status: 'connected',
          label: 'WhatsApp (Meta Embedded Signup)',
          is_primary: false,
          meta_waba_id: waba_id,
          meta_phone_number_id: phoneNumberId,
          phone_number: displayPhoneNumber ?? null,
          credentials_encrypted: credentialsEncrypted,
          metadata: organization_id ? { organization_id } : {},
          connected_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[embedded-signup] account_connections error:', insertError.message);
        return NextResponse.json(
          { error: 'Failed to persist connection' },
          { status: 500 },
        );
      }

      // ── 5. Mirror to whatsapp_config (webhook pipeline) ──────
      await persistToWhatsAppConfig({
        supabase: ctx.supabase,
        accountId: ctx.accountId,
        phoneNumberId: phoneNumberId!,
        wabaId: waba_id,
        tokenEncrypted,
        organizationId: organization_id,
      });

      await bootstrapWabaWebhooks({ wabaId: waba_id, accessToken, phoneNumberId: phoneNumberId! });

      return NextResponse.json({
        success: true,
        connection_id: inserted?.id,
        phone_number_id: phoneNumberId,
        waba_id,
      });
    }

    // ── 5. Mirror to whatsapp_config (webhook pipeline) ──────
    await persistToWhatsAppConfig({
      supabase: ctx.supabase,
      accountId: ctx.accountId,
      phoneNumberId: phoneNumberId!,
      wabaId: waba_id,
      tokenEncrypted,
      organizationId: organization_id,
    });

    // ── 6. Subscribe WABA webhook fields + async syncs ───────
    await bootstrapWabaWebhooks({ wabaId: waba_id, accessToken, phoneNumberId: phoneNumberId! });

    return NextResponse.json({
      success: true,
      connection_id: connection?.id,
      phone_number_id: phoneNumberId,
      waba_id,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

async function persistToWhatsAppConfig({
  supabase,
  accountId,
  phoneNumberId,
  wabaId,
  tokenEncrypted,
  organizationId,
}: {
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;
  accountId: string;
  phoneNumberId: string;
  wabaId: string;
  tokenEncrypted: string;
  organizationId?: string;
}) {
  // Check if a manual connection already exists so we can flag coexistence.
  const { data: existing } = await supabase
    .from('whatsapp_config')
    .select('id, provider')
    .eq('account_id', accountId)
    .maybeSingle();

  // coexistence_enabled = true when there was a prior manual connection.
  const coexistenceEnabled = !!existing && existing.provider !== 'meta_embedded';

  const { error } = await supabase
    .from('whatsapp_config')
    .upsert(
      {
        account_id: accountId,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        access_token: tokenEncrypted,
        status: 'connected',
        provider: 'meta_embedded',
        coexistence_enabled: coexistenceEnabled,
        organization_id: organizationId ?? null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' },
    );

  if (error) {
    // Non-fatal: the account_connections row was already persisted.
    // Webhook delivery will fail until this is fixed, but we don't
    // want to roll back the connection just because of this.
    console.error('[embedded-signup] whatsapp_config upsert error:', error.message);
  }
}

async function bootstrapWabaWebhooks({
  wabaId,
  accessToken,
  phoneNumberId,
}: {
  wabaId: string;
  accessToken: string;
  phoneNumberId: string;
}) {
  // Subscribe WABA to required webhook fields.
  await subscribeWebhookFields({ wabaId, accessToken }).catch((err) => {
    console.error('[embedded-signup] subscribeWebhookFields error:', (err as Error).message);
  });

  // Start history and contacts sync — asynchronous; delivery via webhook.
  await startHistorySync({ phoneNumberId, accessToken }).catch(() => {});
  await startContactsSync({ phoneNumberId, accessToken }).catch(() => {});
}
