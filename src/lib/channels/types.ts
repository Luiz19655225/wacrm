// ============================================================
// Channel adapter interface — the contract every connection
// provider (Meta, Evolution, Meta Embedded) implements.
//
// The interface and all three adapters are fully implemented: the
// Meta adapter delegates to src/lib/whatsapp/meta-api.ts, the
// Evolution adapter to src/lib/whatsapp/evolution-api.ts, and the
// Meta Embedded adapter to meta-embedded-adapter.ts. Routes resolve
// the right one via getChannelAdapter(provider) (registry.ts) and
// drive it from src/app/api/channels/connections/[id]/connect.
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
  /** Required for text messages; ignored (used as caption) when `media` is set. */
  text?: string;
  /** Set for image/video/document/audio sends. `text` (if present) becomes the caption. */
  media?: {
    url: string;
    type: 'image' | 'video' | 'document' | 'audio';
  };
}

export interface ChannelSendResult {
  externalMessageId: string;
}

export interface ChannelConnectResult {
  /**
   * Base64 QR code image, when the provider's pairing flow uses one
   * (Evolution). `null` for providers that don't (Meta — connection
   * happens out-of-band via Embedded Signup, not through this call).
   */
  qrcodeBase64: string | null;
}

/**
 * Common surface every connection provider must implement.
 * `credentials` is the provider-specific decrypted payload —
 * adapters never read `account_connections.credentials_encrypted`
 * directly; the caller decrypts it first (see
 * src/lib/whatsapp/encryption.ts).
 */
export interface ChannelAdapter {
  readonly provider: 'META' | 'EVOLUTION' | 'META_EMBEDDED';

  /**
   * Start (or resume) the provider-side pairing flow for a connection
   * row that was just created. Evolution: provisions an instance and
   * returns a QR code (if the provider hands one back synchronously —
   * otherwise it arrives later via webhook, see
   * src/lib/whatsapp/evolution-webhook-processor.ts). Meta: not part
   * of this flow today — throws ChannelNotImplementedError.
   */
  connect(connection: AccountConnection): Promise<ChannelConnectResult>;

  /** Check whether the connection is actually live on the provider's side. */
  getStatus(connection: AccountConnection): Promise<ChannelStatusResult>;

  /** Send a free-form text or media message through this connection. */
  sendMessage(args: ChannelSendMessageArgs): Promise<ChannelSendResult>;

  /** Tear down the connection on the provider's side (best-effort). */
  disconnect(connection: AccountConnection): Promise<void>;
}
