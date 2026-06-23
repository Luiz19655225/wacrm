// ============================================================
// Meta (META_API / Embedded Signup) channel adapter.
//
// Thin wrapper over the already-working src/lib/whatsapp/meta-api.ts
// — no Meta logic is duplicated here. This adapter exists so
// account_connections rows have a uniform `ChannelAdapter` surface;
// it does not replace or touch `whatsapp_config`, which remains the
// live, production connection path today.
// ============================================================

import { decrypt } from '@/lib/whatsapp/encryption';
import { sendTextMessage, verifyPhoneNumber } from '@/lib/whatsapp/meta-api';
import type { AccountConnection } from '@/types';
import {
  ChannelNotImplementedError,
  type ChannelAdapter,
  type ChannelConnectResult,
  type ChannelSendMessageArgs,
  type ChannelSendResult,
  type ChannelStatusResult,
} from './types';

interface MetaCredentials {
  accessToken: string;
}

function readCredentials(connection: AccountConnection): MetaCredentials {
  // account_connections.credentials_encrypted is stripped before a
  // connection ever reaches the client — this only runs server-side
  // with the raw DB row.
  const raw = (connection as unknown as { credentials_encrypted?: string })
    .credentials_encrypted;
  if (!raw) {
    throw new Error(`Connection ${connection.id} has no stored credentials`);
  }
  return JSON.parse(decrypt(raw)) as MetaCredentials;
}

export const metaAdapter: ChannelAdapter = {
  provider: 'META',

  async connect(): Promise<ChannelConnectResult> {
    // Meta connection happens out-of-band via Embedded Signup /
    // POST /api/whatsapp/config, not through this adapter — see
    // src/lib/channels/types.ts for why this method exists at all
    // (Evolution's QR pairing needs it).
    throw new ChannelNotImplementedError('META', 'connect');
  },

  async getStatus(connection: AccountConnection): Promise<ChannelStatusResult> {
    if (!connection.meta_phone_number_id) {
      return { status: 'error', detail: 'Missing meta_phone_number_id' };
    }
    const { accessToken } = readCredentials(connection);
    try {
      await verifyPhoneNumber({
        phoneNumberId: connection.meta_phone_number_id,
        accessToken,
      });
      return { status: 'connected' };
    } catch (err) {
      return {
        status: 'error',
        detail: err instanceof Error ? err.message : 'Unknown Meta API error',
      };
    }
  },

  async sendMessage(args: ChannelSendMessageArgs): Promise<ChannelSendResult> {
    if (args.media) {
      // Not wired through this adapter yet — /api/whatsapp/send calls
      // src/lib/whatsapp/meta-api.ts's sendMediaMessage directly for
      // Meta today. Throwing here (rather than silently dropping the
      // media) keeps that gap visible if something starts routing
      // Meta media sends through getChannelAdapter().
      throw new ChannelNotImplementedError('META', 'sendMessage(media)');
    }
    if (!args.text) {
      throw new Error('sendMessage requires text when no media is set');
    }
    if (!args.connection.meta_phone_number_id) {
      throw new Error(
        `Connection ${args.connection.id} has no meta_phone_number_id`,
      );
    }
    const { accessToken } = readCredentials(args.connection);
    const result = await sendTextMessage({
      phoneNumberId: args.connection.meta_phone_number_id,
      accessToken,
      to: args.to,
      text: args.text,
    });
    return { externalMessageId: result.messageId };
  },

  async disconnect(): Promise<void> {
    // Meta has no programmatic "revoke this connection" call this
    // codebase uses today (whatsapp_config's own reset is local-only
    // too — see DELETE /api/whatsapp/config). Disconnecting is
    // therefore just clearing local state, which the caller (the
    // API route) handles by updating `connection_status` — nothing
    // to call out to Meta for, so this is an intentional no-op.
  },
};
