// ============================================================
// /api/billing/subscription
//
//   GET  — current account's subscription/trial/access snapshot.
//          Any member (viewer+) — same level as the
//          `account_subscriptions_select` RLS policy. Billing
//          contact (CPF/CNPJ, phone) is only included for admin+ —
//          it's PII, not the same sensitivity as "what plan are we
//          on". Raw Asaas ids are never returned to the client; only
//          an `asaas_connected` boolean.
//   POST — change `plan_code`. Admin+.
//
// Phase 2: when Asaas is configured (`ASAAS_API_KEY` set), POST
// actually creates/reuses an Asaas customer and creates or updates
// (upgrade/downgrade) the Asaas subscription, then persists
// `asaas_customer_id` / `asaas_subscription_id` / `next_due_date`.
// It deliberately never writes `subscription_status` / `access_status`
// — the webhook (src/app/api/billing/webhook/route.ts) is the single
// source of truth for those, so there's never two writers racing on
// the same columns.
//
// Without ASAAS_API_KEY, this falls back to the phase 1 behavior:
// only `plan_code` is updated, nothing calls Asaas. That keeps local
// dev working with no billing credentials configured at all.
// ============================================================

import { NextResponse } from "next/server";
import {
  requireRole,
  getCurrentAccount,
  toErrorResponse,
} from "@/lib/auth/account";
import { hasMinRole } from "@/lib/auth/roles";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  findAsaasCustomerByExternalReference,
  isAsaasConfigured,
  updateAsaasSubscription,
} from "@/lib/billing/asaas-client";
import { supabaseAdmin } from "@/lib/billing/admin-client";
import { decrypt, encrypt } from "@/lib/whatsapp/encryption";

// Always select every column, including the admin-only billing
// contact fields — varying the select string by role would make it
// a runtime-computed string, which the Supabase client's literal
// query-string typing can't parse. Admin-gating happens below, on
// the response object, not on the query.
const SUBSCRIPTION_FIELDS =
  "plan_code, trial_started_at, trial_ends_at, trial_status, subscription_status, access_status, current_period_start, current_period_end, canceled_at, grace_ends_at, next_due_date, asaas_subscription_id, billing_name, billing_document_encrypted, billing_phone_encrypted";

function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch (err) {
    console.error("[billing/subscription] failed to decrypt billing contact field:", err);
    return null;
  }
}

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const isAdmin = hasMinRole(ctx.role, "admin");

    const { data, error } = await ctx.supabase
      .from("account_subscriptions")
      .select(SUBSCRIPTION_FIELDS)
      .eq("account_id", ctx.accountId)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/billing/subscription] query error:", error);
      return NextResponse.json(
        { error: "Failed to load subscription" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ subscription: null, asaas_configured: isAsaasConfigured() });
    }

    const row = data as Record<string, unknown>;
    const subscription = {
      plan_code: row.plan_code,
      trial_started_at: row.trial_started_at,
      trial_ends_at: row.trial_ends_at,
      trial_status: row.trial_status,
      subscription_status: row.subscription_status,
      access_status: row.access_status,
      current_period_start: row.current_period_start,
      current_period_end: row.current_period_end,
      canceled_at: row.canceled_at,
      grace_ends_at: row.grace_ends_at,
      next_due_date: row.next_due_date,
      asaas_connected: Boolean(row.asaas_subscription_id),
      ...(isAdmin
        ? {
            billing_name: row.billing_name ?? null,
            billing_document: safeDecrypt(row.billing_document_encrypted as string | null),
            billing_phone: safeDecrypt(row.billing_phone_encrypted as string | null),
          }
        : {}),
    };

    return NextResponse.json({ subscription, asaas_configured: isAsaasConfigured() });
  } catch (err) {
    return toErrorResponse(err);
  }
}

interface PostBody {
  plan_code?: unknown;
  billing_name?: unknown;
  billing_document?: unknown;
  billing_phone?: unknown;
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Asaas's `POST /subscriptions` (MONTHLY cycle) always returns a
 * `nextDueDate` one full month later than whatever date is sent,
 * regardless of `billingType` or how far out the date already is —
 * confirmed by direct testing against the sandbox API on 2026-06-23
 * (https://docs.asaas.com/docs/criando-uma-assinatura documents
 * related cycle/pre-generation behavior around subscription due
 * dates, though not this exact +1-month shift). To make the first
 * real charge land on `targetDate`, we request `targetDate` minus
 * one month. Only applies to subscription *creation* — updating an
 * existing subscription's value (`updateAsaasSubscription`) doesn't
 * touch `nextDueDate` at all, confirmed by the same testing.
 *
 * TODO: re-verify against production Asaas (not just sandbox) before
 * this path goes live — sandbox and production aren't guaranteed to
 * match on this undocumented behavior.
 */
function oneMonthBefore(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const originalDay = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() - 1);
  // Clamp for month-length overflow (e.g. Mar 31 - 1 month would
  // otherwise roll into early March instead of Feb 28/29).
  if (date.getUTCDate() !== originalDay) {
    date.setUTCDate(0);
  }
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * `oneMonthBefore(targetDate)` only lands in the future when
 * `targetDate` is more than ~1 month out. Our actual call site
 * (trial end, 30 days from signup) is *always* close to exactly one
 * Asaas cycle away, so `oneMonthBefore` resolves to approximately
 * `trial_started_at` — which is in the past the moment any time at
 * all has passed since signup. Confirmed against a real account
 * (signed up 2026-06-22, activating a plan on 2026-06-23): Asaas
 * rejected `nextDueDate: "2026-06-22"` with
 * `invalid_nextDueDate` / "Não é permitido data de vencimento
 * inferior a hoje."
 *
 * Asaas's own rule is just "not less than today" — but we clamp to
 * *tomorrow*, not today, for a one-day safety margin against
 * timezone/clock-skew edge cases (Asaas's "today" is evaluated in
 * its own server timezone, not ours). When the clamp kicks in, the
 * real first charge will land ~1 month from now instead of exactly
 * at `targetDate` — an accepted trade-off (the alternative is
 * rejecting the request outright) — see CLAUDE.md for the decision.
 */
function resolveAsaasFirstDueDate(targetDate: string): string {
  const compensated = oneMonthBefore(targetDate);
  const earliestSafe = addDays(todayDateOnly(), 1);
  return compensated < earliestSafe ? earliestSafe : compensated;
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `billing:plan-change:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as PostBody | null;
    const planCode = body?.plan_code;

    if (typeof planCode !== "string" || planCode.length === 0) {
      return NextResponse.json(
        { error: "'plan_code' must be a non-empty string" },
        { status: 400 },
      );
    }

    const { data: plan, error: planError } = await ctx.supabase
      .from("plans")
      .select("code, price_cents")
      .eq("code", planCode)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) {
      console.error("[POST /api/billing/subscription] plan lookup error:", planError);
      return NextResponse.json(
        { error: "Failed to validate plan" },
        { status: 500 },
      );
    }
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown or inactive plan_code '${planCode}'` },
        { status: 400 },
      );
    }

    if (!isAsaasConfigured()) {
      // Phase 1 behavior, unchanged: no billing provider configured,
      // so just record which plan the account picked.
      const { data, error } = await supabaseAdmin()
        .from("account_subscriptions")
        .update({ plan_code: planCode })
        .eq("account_id", ctx.accountId)
        .select("plan_code")
        .maybeSingle();

      if (error) {
        console.error("[POST /api/billing/subscription] update error:", error);
        return NextResponse.json(
          { error: "Failed to update plan" },
          { status: 500 },
        );
      }

      return NextResponse.json({ subscription: data, asaas_configured: false });
    }

    // ------------------------------------------------------------
    // Asaas-configured path.
    // ------------------------------------------------------------
    const admin = supabaseAdmin();
    const { data: current, error: currentError } = await admin
      .from("account_subscriptions")
      .select(
        "asaas_customer_id, asaas_subscription_id, trial_status, trial_ends_at, billing_document_encrypted, billing_phone_encrypted",
      )
      .eq("account_id", ctx.accountId)
      .maybeSingle();

    if (currentError || !current) {
      console.error("[POST /api/billing/subscription] current row lookup error:", currentError);
      return NextResponse.json(
        { error: "Failed to load current subscription" },
        { status: 500 },
      );
    }

    const submittedDocument = cleanString(body?.billing_document);
    const submittedPhone = cleanString(body?.billing_phone);
    const submittedName = cleanString(body?.billing_name);

    const billingDocument = submittedDocument ?? safeDecrypt(current.billing_document_encrypted);
    const billingPhone = submittedPhone ?? safeDecrypt(current.billing_phone_encrypted);

    if (!billingDocument) {
      return NextResponse.json(
        {
          error: "MISSING_BILLING_INFO",
          message: "CPF or CNPJ is required to activate a paid plan with Asaas.",
        },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await ctx.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[POST /api/billing/subscription] profile lookup error:", profileError);
      return NextResponse.json(
        { error: "Failed to load billing contact name/email" },
        { status: 500 },
      );
    }

    const billingName = submittedName ?? profile.full_name ?? ctx.account.name;
    const value = plan.price_cents / 100;

    const trialStillActive =
      current.trial_status === "active" &&
      Boolean(current.trial_ends_at) &&
      new Date(current.trial_ends_at as string).getTime() > Date.now();
    // The date we actually want the first charge to land on — end of
    // trial if still trialing, otherwise today.
    const nextDueDate = trialStillActive
      ? (current.trial_ends_at as string).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    try {
      let asaasCustomerId = current.asaas_customer_id as string | null;
      if (!asaasCustomerId) {
        const existingCustomer = await findAsaasCustomerByExternalReference(ctx.accountId);
        asaasCustomerId = existingCustomer
          ? existingCustomer.id
          : (
              await createAsaasCustomer({
                name: billingName,
                email: profile.email,
                cpfCnpj: billingDocument,
                mobilePhone: billingPhone ?? undefined,
                externalReference: ctx.accountId,
              })
            ).id;

        // Persist immediately so a failure further down doesn't
        // orphan this customer (next attempt would otherwise create
        // a second one, since asaas_customer_id would still be null).
        await admin
          .from("account_subscriptions")
          .update({ asaas_customer_id: asaasCustomerId })
          .eq("account_id", ctx.accountId);
      }

      let asaasSubscriptionId = current.asaas_subscription_id as string | null;
      let resolvedNextDueDate = nextDueDate;
      if (!asaasSubscriptionId) {
        const subscription = await createAsaasSubscription({
          customer: asaasCustomerId,
          value,
          nextDueDate: resolveAsaasFirstDueDate(nextDueDate),
          cycle: "MONTHLY",
          externalReference: ctx.accountId,
        });
        asaasSubscriptionId = subscription.id;
        resolvedNextDueDate = subscription.nextDueDate;
      } else {
        // Upgrade/downgrade: update the value on the existing
        // subscription. No proration — the new value takes effect on
        // the next charge Asaas generates.
        const updated = await updateAsaasSubscription(asaasSubscriptionId, { value });
        resolvedNextDueDate = updated.nextDueDate ?? nextDueDate;
      }

      const { data: updatedRow, error: updateError } = await admin
        .from("account_subscriptions")
        .update({
          plan_code: planCode,
          asaas_customer_id: asaasCustomerId,
          asaas_subscription_id: asaasSubscriptionId,
          next_due_date: resolvedNextDueDate,
          billing_name: billingName,
          billing_document_encrypted: encrypt(billingDocument),
          billing_phone_encrypted: billingPhone ? encrypt(billingPhone) : current.billing_phone_encrypted,
        })
        .eq("account_id", ctx.accountId)
        .select("plan_code")
        .maybeSingle();

      if (updateError) {
        console.error("[POST /api/billing/subscription] post-Asaas update error:", updateError);
        return NextResponse.json(
          { error: "Plan was updated with Asaas but failed to save locally. Please contact support." },
          { status: 500 },
        );
      }

      return NextResponse.json({ subscription: updatedRow, asaas_configured: true });
    } catch (err) {
      console.error("[POST /api/billing/subscription] Asaas call failed:", err);
      return NextResponse.json(
        { error: "Failed to update billing with Asaas. Please try again." },
        { status: 502 },
      );
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
