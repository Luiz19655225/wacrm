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
  connectInstance,
  createInstance,
  deleteInstance,
  fetchConnectionState,
  logoutInstance,
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
    // instanceName = account_id: stable 1:1 mapping the webhook resolves back
    // via account_connections.external_id (enforced unique per migration 030).
    //
    // FAST PATH — tenta conectar/renovar QR numa instância já existente via
    // GET /instance/connect/{name}. Funciona em qualquer estado da instância
    // (close, connecting, open). Evita o 403 "name already in use" que surge
    // quando a instância está em "connecting/qrcode" state: DELETE /instance/delete
    // falha silenciosamente nesse estado (Evolution recusa o delete), então o
    // createInstance seguinte encontra o nome ainda em uso.
    //
    // FULL RESET — usado apenas no primeiro setup ou quando a instância sumiu no
    // servidor Evolution (Railway restart, delete manual). Fluxo:
    // logout → delete → 1 s → create com webhook configurado.
    const name = connection.account_id;
    try {
      const result = await connectInstance(name);
      return { qrcodeBase64: result.qrcodeBase64 };
    } catch {
      // Instância não existe no servidor Evolution → full reset
    }
    try { await logoutInstance(name); } catch { /* not connected or doesn't exist */ }
    try { await deleteInstance(name); } catch { /* doesn't exist — fine */ }
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    const result = await createInstance(name, webhookUrl(), webhookToken());
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
