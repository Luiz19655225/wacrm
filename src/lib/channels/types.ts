// ============================================================
// Channel adapter interface — the contract every connection
// provider (Meta, Evolution, and whatever comes after) implements.
//
// Phase 1 scope: the interface and a Meta adapter that delegates to
// the already-working src/lib/whatsapp/meta-api.ts (no new Meta
// logic — just a common shape), plus an Evolution stub that throws
// `ChannelNotImplementedError` for everything. No adapter here is
// wired into account_connections rows yet beyond create/list — see
// src/app/api/channels/connections/route.ts.
// ============================================================

import type { AccountConnection, ChannelConnectionStatus } from '@/types';

export class ChannelNotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider} adapter does not implement '${method}' yet`);
    this.name = 'ChannelNotImplementedError';
  }
}

export interface ChannelStatusResult {
  status: ChannelConnectionStatus;
  detail?: string;
}

export interface ChannelSendMessageArgs {
  connection: AccountConnection;
  to: string;
  text: string;
}

export interface ChannelSendResult {
  externalMessageId: string;
}

/**
 * Common surface every connection provider must implement.
 * `credentials` is the provider-specific decrypted payload —
 * adapters never read `account_connections.credentials_encrypted`
 * directly; the caller decrypts it first (see
 * src/lib/whatsapp/encryption.ts).
 */
export interface ChannelAdapter {
  readonly provider: 'META' | 'EVOLUTION';

  /** Check whether the connection is actually live on the provider's side. */
  getStatus(connection: AccountConnection): Promise<ChannelStatusResult>;

  /** Send a free-form text message through this connection. */
  sendMessage(args: ChannelSendMessageArgs): Promise<ChannelSendResult>;

  /** Tear down the connection on the provider's side (best-effort). */
  disconnect(connection: AccountConnection): Promise<void>;
}
