// ============================================================
// /api/billing/webhook
//
// Inbound Asaas webhook receiver. No Supabase session — exempted
// from the auth check in src/middleware.ts the same way
// /api/whatsapp/webhook is. Authenticity instead comes from the
// `asaas-access-token` header, which must match `ASAAS_WEBHOOK_TOKEN`
// (the static token you configure on the Asaas webhook settings
// page) — fails closed if that env var isn't set, same posture as
// verifyMetaWebhookSignature in src/lib/whatsapp/webhook-signature.ts.
//
// Phase 1 boundary: this only records the event into `billing_events`
// for audit/debugging. It deliberately does NOT update
// account_subscriptions.subscription_status / access_status — wiring
// real status transitions from these events is phase 2 work, once
// there's an actual Asaas account to verify the payload shapes
// against.
// ============================================================

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/billing/admin-client";
import { normalizeAsaasEventType } from "@/lib/billing/status";
import type { AsaasWebhookPayload } from "@/lib/billing/types";
import { isUniqueViolation } from "@/lib/contacts/dedupe";

function isAuthorized(request: Request): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) {
    console.error(
      "[billing webhook] ASAAS_WEBHOOK_TOKEN is not set — rejecting request.",
    );
    return false;
  }
  const provided = request.headers.get("asaas-access-token");
  if (!provided) return false;

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | AsaasWebhookPayload
    | null;
  if (!payload || typeof payload.event !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const externalReference =
    (payload.subscription?.externalReference as string | undefined) ??
    (payload.payment?.externalReference as string | undefined) ??
    null;
  // `externalReference` is the account_id we set when (phase 2)
  // creating the Asaas customer/subscription. Phase 1 has no live
  // Asaas integration creating that reference yet, so this will
  // typically resolve to null for now — the event is still recorded.
  const accountId =
    externalReference && /^[0-9a-f-]{36}$/i.test(externalReference)
      ? externalReference
      : null;

  const externalEventId =
    (payload.payment?.id as string | undefined) ??
    (payload.subscription?.id as string | undefined) ??
    null;

  // Phase 1 never acts on a billing event — every row lands as
  // 'ignored' regardless of whether we could resolve an account_id.
  // Phase 2 swaps this insert for real processing (and a real
  // 'processed' / 'failed' outcome).
  const { error } = await supabaseAdmin().from("billing_events").insert({
    account_id: accountId,
    provider: "asaas",
    event_type: normalizeAsaasEventType(payload.event),
    provider_event_type: payload.event,
    external_event_id: externalEventId,
    payload,
    processing_status: "ignored",
    error_message: accountId
      ? null
      : "Could not resolve account_id from externalReference (phase 1: no live Asaas link yet)",
  });

  if (error) {
    if (isUniqueViolation(error)) {
      // Asaas retries webhooks that didn't get a 2xx. We already
      // recorded this external_event_id on a previous delivery —
      // treat the retry as a success instead of erroring forever.
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Don't leak internals to Asaas's retry logic, but do return a
    // non-2xx so Asaas retries — a transient DB hiccup shouldn't
    // silently drop a billing event forever.
    console.error("[POST /api/billing/webhook] insert error:", error);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
