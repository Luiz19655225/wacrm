// ============================================================
// /api/billing/webhook
//
// Inbound Asaas webhook receiver. No Supabase session — never
// matched by the `/api/whatsapp/*` auth check in src/middleware.ts
// (that check only applies to whatsapp routes), so this is reachable
// unauthenticated by design. Authenticity instead comes from the
// `asaas-access-token` header, which must match `ASAAS_WEBHOOK_TOKEN`
// (the static token you configure on the Asaas webhook settings
// page) — fails closed if that env var isn't set, same posture as
// verifyMetaWebhookSignature in src/lib/whatsapp/webhook-signature.ts.
//
// Phase 2: this is where `account_subscriptions` actually gets
// updated from real Asaas events — see
// src/lib/billing/webhook-processor.ts for the side effects.
//
// Idempotency, including retry-after-failure
// -------------------------------------------
// Asaas retries a webhook delivery that didn't get a 2xx. The
// `(provider, external_event_id)` unique index exists so a retry of
// an *already-processed* event doesn't get double-applied. But a
// retry of an event whose handler *threw* last time must actually
// re-run the handler — a plain "insert, ignore on conflict" would
// silently swallow every retry forever after one failure. So:
//   - look the event up by (provider, external_event_id) first
//   - 'processed' or 'ignored' (terminal) -> short-circuit, no rerun
//   - 'pending' or 'failed' (not terminal) -> reuse that row, retry
//   - not found -> insert a fresh 'pending' row
// ============================================================

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/billing/admin-client";
import { normalizeAsaasEventType } from "@/lib/billing/status";
import { processBillingEvent } from "@/lib/billing/webhook-processor";
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

async function resolveAccountId(
  payload: AsaasWebhookPayload,
): Promise<string | null> {
  const externalReference =
    (payload.subscription?.externalReference as string | undefined) ??
    (payload.payment?.externalReference as string | undefined) ??
    null;
  if (externalReference && /^[0-9a-f-]{36}$/i.test(externalReference)) {
    return externalReference;
  }

  // Fallback: a payment generated from a subscription always carries
  // `payment.subscription` (the Asaas subscription id), even on the
  // rare delivery where `externalReference` is missing/blank. We
  // already store that id on our side once a subscription is
  // created (src/app/api/billing/subscription/route.ts), so this
  // resolves the account without needing externalReference at all.
  const subscriptionId =
    (payload.payment?.subscription as string | undefined) ??
    (payload.subscription?.id as string | undefined) ??
    null;
  if (!subscriptionId) return null;

  const { data, error } = await supabaseAdmin()
    .from("account_subscriptions")
    .select("account_id")
    .eq("asaas_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) {
    console.error("[billing webhook] account lookup by subscription id failed:", error);
    return null;
  }
  return data?.account_id ?? null;
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

  const eventType = normalizeAsaasEventType(payload.event);
  const externalEventId =
    (payload.payment?.id as string | undefined) ??
    (payload.subscription?.id as string | undefined) ??
    null;

  const admin = supabaseAdmin();

  // Look up a prior delivery of this same event id, if any.
  let eventRowId: string | null = null;
  if (externalEventId) {
    const { data: existing, error: lookupError } = await admin
      .from("billing_events")
      .select("id, processing_status")
      .eq("provider", "asaas")
      .eq("external_event_id", externalEventId)
      .maybeSingle();
    if (lookupError) {
      console.error("[POST /api/billing/webhook] lookup error:", lookupError);
      return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
    }
    if (existing) {
      if (existing.processing_status === "processed" || existing.processing_status === "ignored") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      // 'pending' or 'failed' — reuse the row, retry the handler below.
      eventRowId = existing.id as string;
    }
  }

  const accountId = await resolveAccountId(payload);

  if (eventRowId === null) {
    const { data: inserted, error: insertError } = await admin
      .from("billing_events")
      .insert({
        account_id: accountId,
        provider: "asaas",
        event_type: eventType,
        provider_event_type: payload.event,
        external_event_id: externalEventId,
        payload,
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      if (isUniqueViolation(insertError)) {
        // Lost a race with a concurrent delivery of the same event —
        // the other request owns processing this one.
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error("[POST /api/billing/webhook] insert error:", insertError);
      return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
    }
    eventRowId = inserted.id as string;
  }

  if (!accountId) {
    await admin
      .from("billing_events")
      .update({
        processing_status: "ignored",
        error_message: "Could not resolve account_id from externalReference or asaas_subscription_id",
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventRowId);
    return NextResponse.json({ received: true });
  }

  try {
    const result = await processBillingEvent(accountId, eventType, payload);
    await admin
      .from("billing_events")
      .update({
        account_id: accountId,
        processing_status: result.outcome,
        error_message: result.note ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventRowId);
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown processing error";
    console.error("[POST /api/billing/webhook] processing error:", err);
    await admin
      .from("billing_events")
      .update({
        account_id: accountId,
        processing_status: "failed",
        error_message: message,
      })
      .eq("id", eventRowId);
    // Non-2xx so Asaas retries — a transient failure shouldn't
    // permanently drop a billing event.
    return NextResponse.json({ error: "Failed to process event" }, { status: 500 });
  }
}
