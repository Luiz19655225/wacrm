// ============================================================
// /api/billing/plans
//
//   GET — list active plans, for the plan picker. Any authenticated
//         user (not account-scoped — it's a shared catalog, same as
//         the `plans_select` RLS policy in 024_billing_plans.sql).
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    const { data, error } = await ctx.supabase
      .from("plans")
      .select(
        "code, name, public_name, description, public_description, price_cents, currency, max_team_members, max_connections, max_automations, max_contacts, features, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[GET /api/billing/plans] query error:", error);
      return NextResponse.json(
        { error: "Failed to load plans" },
        { status: 500 },
      );
    }

    return NextResponse.json({ plans: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
