// ============================================================
// Evolution (QR_CODE / WhatsApp Web) channel adapter — STUB.
//
// QR Code is a first-class connection type, not a provisional one
// (product decision) — but the actual Evolution API integration is
// out of scope for phase 1. Every method here throws
// `ChannelNotImplementedError` so the rest of the app can already
// depend on the `ChannelAdapter` interface and on
// `account_connections` rows of type QR_CODE existing, without an
// Evolution instance configured anywhere yet. Phase 4 replaces this
// file's internals; the interface should not need to change.
// ============================================================

import type { AccountConnection } from '@/types';
import {
  ChannelNotImplementedError,
  type ChannelAdapter,
  type ChannelSendMessageArgs,
  type ChannelSendResult,
  type ChannelStatusResult,
} from './types';

export const evolutionAdapter: ChannelAdapter = {
  provider: 'EVOLUTION',

  async getStatus(_connection: AccountConnection): Promise<ChannelStatusResult> {
    throw new ChannelNotImplementedError('EVOLUTION', 'getStatus');
  },

  async sendMessage(_args: ChannelSendMessageArgs): Promise<ChannelSendResult> {
    throw new ChannelNotImplementedError('EVOLUTION', 'sendMessage');
  },

  async disconnect(_connection: AccountConnection): Promise<void> {
    throw new ChannelNotImplementedError('EVOLUTION', 'disconnect');
  },
};
