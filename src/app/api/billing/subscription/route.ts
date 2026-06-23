// ============================================================
// /api/billing/subscription
//
//   GET  — current account's subscription/trial/access snapshot.
//          Any member (viewer+) — same level as the
//          `account_subscriptions_select` RLS policy.
//   POST — change `plan_code`. Admin+.
//
// Phase 1 boundary: POST only updates which plan the account is
// recorded against. It deliberately does NOT call Asaas to create a
// real customer/subscription — `src/lib/billing/asaas-client.ts` is
// written but unverified against a real Asaas account in this
// environment, and triggering a real billing side effect from an
// unverified client is not something to do silently. Wiring POST to
// actually call Asaas is phase 2 work.
// ============================================================

import { NextResponse } from "next/server";
import {
  requireRole,
  getCurrentAccount,
  toErrorResponse,
} from "@/lib/auth/account";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { isAsaasConfigured } from "@/lib/billing/asaas-client";
import { supabaseAdmin } from "@/lib/billing/admin-client";

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    const { data, error } = await ctx.supabase
      .from("account_subscriptions")
      .select(
        "plan_code, trial_started_at, trial_ends_at, trial_status, subscription_status, access_status, current_period_start, current_period_end, canceled_at, grace_ends_at, next_due_date",
      )
      .eq("account_id", ctx.accountId)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/billing/subscription] query error:", error);
      return NextResponse.json(
        { error: "Failed to load subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json({ subscription: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `billing:plan-change:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as
      | { plan_code?: unknown }
      | null;
    const planCode = body?.plan_code;

    if (typeof planCode !== "string" || planCode.length === 0) {
      return NextResponse.json(
        { error: "'plan_code' must be a non-empty string" },
        { status: 400 },
      );
    }

    const { data: plan, error: planError } = await ctx.supabase
      .from("plans")
      .select("code")
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

    // account_subscriptions has no UPDATE policy for regular users
    // at all (025_account_subscriptions.sql) — every status column
    // is meant to be service-role-only. requireRole("admin") above
    // is the actual authorization check for this route; we use the
    // service-role client to perform the write because RLS would
    // otherwise silently affect 0 rows even for an admin/owner. The
    // write is narrowly scoped to this caller's own account_id and
    // to the single `plan_code` column, so this doesn't reopen the
    // status columns to client control.
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

    return NextResponse.json({
      subscription: data,
      asaas_configured: isAsaasConfigured(),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
