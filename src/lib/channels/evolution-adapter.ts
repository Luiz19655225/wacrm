// ============================================================
// Evolution (QR_CODE / WhatsApp Web) channel adapter — Fase 3.
//
// Thin wrapper over src/lib/whatsapp/evolution-api.ts (the raw HTTP
// client), same relationship meta-adapter.ts has with meta-api.ts —
// no Evolution wire-protocol logic duplicated here, just the
// ChannelAdapter shape. instanceName is always
// connection.external_id, set by connect() the first time it runs
// (instanceName = account_id — see evolution-api.ts).
// ============================================================

import {
  createInstance,
  deleteInstance,
  fetchConnectionState,
  sendMediaMessage,
  sendTextMessage,
} from '@/lib/whatsapp/evolution-api';
import type { AccountConnection, ChannelConnectionStatus } from '@/types';
import {
  ChannelNotImplementedError,
  type ChannelAdapter,
  type ChannelConnectResult,
  type ChannelSendMessageArgs,
  type ChannelSendResult,
  type ChannelStatusResult,
} from './types';

function requireInstanceName(connection: AccountConnection): string {
  if (!connection.external_id) {
    throw new Error(`Connection ${connection.id} has no Evolution instance yet — call connect() first`);
  }
  return connection.external_id;
}

function webhookUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/+$/, '');
  if (!base) throw new Error('NEXT_PUBLIC_SITE_URL is not configured');
  return `${base}/api/webhooks/evolution`;
}

function webhookToken(): string {
  const token = process.env.EVOLUTION_WEBHOOK_TOKEN;
  if (!token) throw new Error('EVOLUTION_WEBHOOK_TOKEN is not configured');
  return token;
}

function mapState(state: string): ChannelConnectionStatus {
  switch (state) {
    case 'open':
      return 'connected';
    case 'close':
      return 'disconnected';
    default:
      return 'pending';
  }
}

export const evolutionAdapter: ChannelAdapter = {
  provider: 'EVOLUTION',

  async connect(connection: AccountConnection): Promise<ChannelConnectResult> {
    // instanceName = account_id: stable 1:1 mapping the webhook
    // resolves back via account_connections.external_id (enforced
    // unique per migration 030_evolution_connections.sql).
    //
    // Delete any pre-existing Evolution instance before recreating it.
    // instanceName is deterministic (= account_id), so we don't need
    // external_id to be set — we know the name. If Evolution returns
    // 404 (first-time setup), we catch and continue.
    try {
      await deleteInstance(connection.account_id);
    } catch {
      // Instance may not exist yet — that is fine.
    }
    const result = await createInstance(connection.account_id, webhookUrl(), webhookToken());
    return { qrcodeBase64: result.qrcodeBase64 };
  },

  async getStatus(connection: AccountConnection): Promise<ChannelStatusResult> {
    if (!connection.external_id) {
      return { status: 'pending', detail: 'Instance not provisioned yet' };
    }
    try {
      const state = await fetchConnectionState(connection.external_id);
      return { status: mapState(state) };
    } catch (err) {
      return {
        status: 'error',
        detail: err instanceof Error ? err.message : 'Unknown Evolution API error',
      };
    }
  },

  async sendMessage(args: ChannelSendMessageArgs): Promise<ChannelSendResult> {
    const instanceName = requireInstanceName(args.connection);
    if (args.media) {
      const result = await sendMediaMessage(
        instanceName,
        args.to,
        args.media.url,
        args.media.type,
        args.text,
      );
      return { externalMessageId: result?.key?.id ?? '' };
    }
    if (!args.text) {
      throw new Error('sendMessage requires either text or media');
    }
    const result = await sendTextMessage(instanceName, args.to, args.text);
    return { externalMessageId: result?.key?.id ?? '' };
  },

  async disconnect(connection: AccountConnection): Promise<void> {
    if (!connection.external_id) return; // never provisioned — nothing to tear down
    await deleteInstance(connection.external_id);
  },
};

// Re-exported only so callers that genuinely need the
// "not implemented" sentinel (rare — most should go through
// getChannelAdapter()) can still reference it consistently.
export { ChannelNotImplementedError };
