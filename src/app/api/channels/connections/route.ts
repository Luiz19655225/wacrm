// ============================================================
// /api/channels/connections
//
//   GET  — list this account's connections. Any member (viewer+).
//   POST — create a placeholder connection row. Admin+.
//
// Phase 1 boundary: POST only persists the row (connection_type,
// provider, label) with connection_status='pending'. It does not
// call any adapter, does not store credentials, and does not touch
// `whatsapp_config` — the existing, live Meta connection keeps
// working exactly as it does today, completely independent of this
// table. Actually driving a connection through an adapter
// (src/lib/channels/) is later-phase work.
// ============================================================

import { NextResponse } from "next/server";
import {
  requireRole,
  getCurrentAccount,
  toErrorResponse,
} from "@/lib/auth/account";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import type { ChannelConnectionType, ChannelProvider } from "@/types";

const TYPE_PROVIDER_PAIRS: Record<ChannelConnectionType, ChannelProvider> = {
  QR_CODE: "EVOLUTION",
  META_API: "META",
};

const CONNECTION_FIELDS =
  "id, connection_type, provider, connection_status, label, is_primary, phone_number, external_id, meta_waba_id, meta_phone_number_id, connected_at, last_error, created_at, updated_at";

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    // credentials_encrypted is intentionally excluded from
    // CONNECTION_FIELDS — it never leaves the server.
    const { data, error } = await ctx.supabase
      .from("account_connections")
      .select(CONNECTION_FIELDS)
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/channels/connections] query error:", error);
      return NextResponse.json(
        { error: "Failed to load connections" },
        { status: 500 },
      );
    }

    return NextResponse.json({ connections: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `channels:create:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as
      | { connection_type?: unknown; label?: unknown }
      | null;
    const connectionType = body?.connection_type;
    const label = body?.label;

    if (
      typeof connectionType !== "string" ||
      !(connectionType in TYPE_PROVIDER_PAIRS)
    ) {
      return NextResponse.json(
        { error: "'connection_type' must be 'QR_CODE' or 'META_API'" },
        { status: 400 },
      );
    }
    if (label !== undefined && typeof label !== "string") {
      return NextResponse.json(
        { error: "'label' must be a string" },
        { status: 400 },
      );
    }

    const provider = TYPE_PROVIDER_PAIRS[connectionType as ChannelConnectionType];

    const { data, error } = await ctx.supabase
      .from("account_connections")
      .insert({
        account_id: ctx.accountId,
        connection_type: connectionType,
        provider,
        connection_status: "pending",
        label: label ?? null,
      })
      .select(CONNECTION_FIELDS)
      .single();

    if (error) {
      console.error("[POST /api/channels/connections] insert error:", error);
      return NextResponse.json(
        { error: "Failed to create connection" },
        { status: 500 },
      );
    }

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
