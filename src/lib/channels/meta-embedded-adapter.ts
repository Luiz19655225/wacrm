// ============================================================
// Meta Embedded Signup (META_EMBEDDED) channel adapter.
//
// Handles connections created via the Meta Embedded Signup OAuth
// flow — credentials live in account_connections.credentials_encrypted,
// not in whatsapp_config. All Meta API calls are delegated to the
// shared meta-api.ts functions; no logic is duplicated here.
//
// connect() is intentionally not implemented: the OAuth handshake
// happens out-of-band via POST /api/whatsapp/embedded-signup/exchange,
// not through the ChannelAdapter.connect() method.
// ============================================================

import { decrypt } from '@/lib/whatsapp/encryption';
import {
  sendTextMessage,
  sendMediaMessage,
  verifyPhoneNumber,
  type MediaKind,
} from '@/lib/whatsapp/meta-api';
import type { AccountConnection } from '@/types';
import {
  ChannelNotImplementedError,
  type ChannelAdapter,
  type ChannelConnectResult,
  type ChannelSendMessageArgs,
  type ChannelSendResult,
  type ChannelStatusResult,
} from './types';

interface MetaEmbeddedCredentials {
  accessToken: string;
  /** Long-lived system user token obtained after code exchange. */
  refreshToken?: string;
}

function readCredentials(connection: AccountConnection): MetaEmbeddedCredentials {
  const raw = (connection as unknown as { credentials_encrypted?: string })
    .credentials_encrypted;
  if (!raw) {
    throw new Error(`Connection ${connection.id} has no stored credentials`);
  }
  return JSON.parse(decrypt(raw)) as MetaEmbeddedCredentials;
}

export const metaEmbeddedAdapter: ChannelAdapter = {
  provider: 'META_EMBEDDED',

  async connect(): Promise<ChannelConnectResult> {
    // Embedded Signup is an OAuth flow handled by
    // POST /api/whatsapp/embedded-signup/exchange — not this method.
    throw new ChannelNotImplementedError('META_EMBEDDED', 'connect');
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
    if (!args.connection.meta_phone_number_id) {
      throw new Error(
        `Connection ${args.connection.id} has no meta_phone_number_id`,
      );
    }
    const { accessToken } = readCredentials(args.connection);

    if (args.media) {
      const result = await sendMediaMessage({
        phoneNumberId: args.connection.meta_phone_number_id,
        accessToken,
        to: args.to,
        kind: args.media.type as MediaKind,
        link: args.media.url,
        caption: args.text,
      });
      return { externalMessageId: result.messageId };
    }

    if (!args.text) {
      throw new Error('sendMessage requires text when no media is set');
    }
    const result = await sendTextMessage({
      phoneNumberId: args.connection.meta_phone_number_id,
      accessToken,
      to: args.to,
      text: args.text,
    });
    return { externalMessageId: result.messageId };
  },

  async disconnect(): Promise<void> {
    // Meta provides no programmatic revoke for Embedded Signup tokens
    // that maps cleanly to a single API call. The caller updates
    // connection_status in account_connections; nothing to call out to
    // Meta for.
  },
};
