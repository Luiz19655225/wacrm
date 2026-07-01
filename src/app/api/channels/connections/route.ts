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
  META_EMBEDDED: "META_EMBEDDED",
};

const CONNECTION_FIELDS =
  "id, connection_type, provider, connection_status, label, is_primary, phone_number, external_id, meta_waba_id, meta_phone_number_id, metadata, connected_at, last_error, created_at, updated_at";

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
        { error: "'connection_type' must be 'QR_CODE', 'META_API', or 'META_EMBEDDED'" },
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

    // QR_CODE/EVOLUTION: enforce one connection per workspace.
    // Evolution maps instanceName = accountId (1:1), so more than one
    // QR_CODE row for the same account is always a mistake — the second
    // instance would collide with the first on the Evolution server.
    // Return the most-recent existing row and silently delete any
    // older duplicates that may have accumulated before this guard.
    if (connectionType === "QR_CODE") {
      const { data: existingRows, error: existingError } = await ctx.supabase
        .from("account_connections")
        .select(CONNECTION_FIELDS)
        .eq("account_id", ctx.accountId)
        .eq("connection_type", "QR_CODE")
        .order("created_at", { ascending: false }); // most recent first

      if (existingError) {
        console.error("[POST /api/channels/connections] QR_CODE lookup error:", existingError);
        return NextResponse.json(
          { error: "Failed to check existing connections" },
          { status: 500 },
        );
      }

      if (existingRows && existingRows.length > 0) {
        const primary = existingRows[0];

        // Purge stale duplicates so the UI only ever shows one row
        if (existingRows.length > 1) {
          const staleIds = existingRows.slice(1).map((c: Record<string, unknown>) => c.id as string);
          const { error: delErr } = await ctx.supabase
            .from("account_connections")
            .delete()
            .in("id", staleIds)
            .eq("account_id", ctx.accountId); // safety guard
          if (delErr) {
            console.warn("[POST /api/channels/connections] stale QR_CODE cleanup failed:", delErr);
          } else {
            console.info(
              `[POST /api/channels/connections] purged ${staleIds.length} duplicate QR_CODE rows for account ${ctx.accountId}`,
            );
          }
        }

        return NextResponse.json({ connection: primary, reused: true });
      }
      // No existing QR_CODE connection → fall through to INSERT
    } else {
      // Non-QR_CODE types (META_API, META_EMBEDDED): keep the original
      // pending-only dedup. Multiple META_API connections are allowed.
      const { data: existingPendingRows, error: existingError } = await ctx.supabase
        .from("account_connections")
        .select(CONNECTION_FIELDS)
        .eq("account_id", ctx.accountId)
        .eq("connection_type", connectionType)
        .eq("connection_status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);

      if (existingError) {
        console.error("[POST /api/channels/connections] existing-pending lookup error:", existingError);
        return NextResponse.json(
          { error: "Failed to check existing connections" },
          { status: 500 },
        );
      }
      if (existingPendingRows && existingPendingRows.length > 0) {
        return NextResponse.json({ connection: existingPendingRows[0], reused: true });
      }
    }

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
