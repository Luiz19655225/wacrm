// ============================================================
// Asaas webhook side effects — the I/O half of billing event
// handling. Pure status logic lives in `status.ts`; this module
// reads/writes `account_subscriptions` and (best-effort) calls back
// into Asaas to refresh cycle dates. Used exclusively by
// `src/app/api/billing/webhook/route.ts`.
//
// Phase 2 boundary: only the event types listed in `EVENT_HANDLERS`
// below mutate `account_subscriptions`. `payment_deleted` and
// `payment_refunded` are recorded (the caller still gets
// outcome: 'processed') but deliberately don't change any status —
// a refund is rare enough, and ambiguous enough (full vs. partial,
// test vs. real charge), that auto-canceling access on it is more
// likely to wrongly cut someone off than to catch real abuse. Manual
// review via `billing_events` is the phase 2 answer; revisit if
// refunds turn out to be common enough to warrant automation.
// ============================================================

import { supabaseAdmin } from './admin-client';
import { getAsaasSubscription } from './asaas-client';
import { computeAccessStatus, PAST_DUE_GRACE_DAYS } from './status';
import type { AsaasWebhookPayload } from './types';
import type { AccountSubscription } from '@/types';

export interface ProcessBillingEventResult {
  outcome: 'processed' | 'ignored';
  note?: string;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loadSubscription(
  accountId: string,
): Promise<Pick<AccountSubscription, 'trial_status' | 'asaas_subscription_id'> | null> {
  const { data, error } = await supabaseAdmin()
    .from('account_subscriptions')
    .select('trial_status, asaas_subscription_id')
    .eq('account_id', accountId)
    .maybeSingle();
  if (error) {
    console.error('[webhook-processor] failed to load subscription:', error);
    return null;
  }
  return data;
}

async function markPaymentConfirmed(
  accountId: string,
  payload: AsaasWebhookPayload,
): Promise<ProcessBillingEventResult> {
  const current = await loadSubscription(accountId);
  const newTrialStatus = current?.trial_status === 'active' ? 'converted' : current?.trial_status ?? 'not_applicable';
  const accessStatus = computeAccessStatus(newTrialStatus, 'active');

  const update: Record<string, unknown> = {
    subscription_status: 'active',
    access_status: accessStatus,
    trial_status: newTrialStatus,
    canceled_at: null,
    grace_ends_at: null,
  };

  // Best-effort refresh of the cycle window from Asaas — display
  // only (next_due_date/current_period_* are never read for gating,
  // see 025_account_subscriptions.sql). A failure here must not block
  // the status update above.
  const subscriptionId =
    (payload.payment?.subscription as string | undefined) ?? current?.asaas_subscription_id ?? null;
  if (subscriptionId) {
    try {
      const sub = await getAsaasSubscription(subscriptionId);
      update.next_due_date = sub.nextDueDate;
      update.current_period_start = toDateOnly(new Date());
      update.current_period_end = sub.nextDueDate;
    } catch (err) {
      console.error('[webhook-processor] failed to refresh subscription cycle:', err);
    }
  }

  const { error } = await supabaseAdmin()
    .from('account_subscriptions')
    .update(update)
    .eq('account_id', accountId);
  if (error) {
    throw new Error(`Failed to apply payment_confirmed update: ${error.message}`);
  }
  return { outcome: 'processed' };
}

async function markPaymentOverdue(accountId: string): Promise<ProcessBillingEventResult> {
  const current = await loadSubscription(accountId);
  const trialStatus = current?.trial_status ?? 'not_applicable';
  const accessStatus = computeAccessStatus(trialStatus, 'past_due');
  const graceEndsAt = new Date(Date.now() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabaseAdmin()
    .from('account_subscriptions')
    .update({
      subscription_status: 'past_due',
      access_status: accessStatus,
      grace_ends_at: graceEndsAt.toISOString(),
    })
    .eq('account_id', accountId);
  if (error) {
    throw new Error(`Failed to apply payment_overdue update: ${error.message}`);
  }
  return { outcome: 'processed' };
}

async function markSubscriptionCanceled(accountId: string): Promise<ProcessBillingEventResult> {
  const { error } = await supabaseAdmin()
    .from('account_subscriptions')
    .update({
      subscription_status: 'canceled',
      access_status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('account_id', accountId);
  if (error) {
    throw new Error(`Failed to apply subscription_canceled update: ${error.message}`);
  }
  return { outcome: 'processed' };
}

const EVENT_HANDLERS: Record<
  string,
  (accountId: string, payload: AsaasWebhookPayload) => Promise<ProcessBillingEventResult>
> = {
  payment_confirmed: markPaymentConfirmed,
  payment_received: markPaymentConfirmed,
  payment_overdue: (accountId) => markPaymentOverdue(accountId),
  subscription_canceled: (accountId) => markSubscriptionCanceled(accountId),
  payment_deleted: async () => ({
    outcome: 'processed',
    note: 'Recorded only — no automatic status change on payment_deleted (phase 2 decision).',
  }),
  payment_refunded: async () => ({
    outcome: 'processed',
    note: 'Recorded only — no automatic status change on payment_refunded (phase 2 decision).',
  }),
};

/**
 * Applies the side effects for one normalized billing event onto
 * `account_subscriptions`. Returns `{ outcome: 'ignored' }` for any
 * `event_type` we don't have a handler for (still recorded in
 * `billing_events` by the caller — just doesn't touch subscription
 * state). Throws on a handler failure so the caller can mark the
 * `billing_events` row `failed` and let Asaas retry the delivery.
 */
export async function processBillingEvent(
  accountId: string,
  eventType: string,
  payload: AsaasWebhookPayload,
): Promise<ProcessBillingEventResult> {
  const handler = EVENT_HANDLERS[eventType];
  if (!handler) {
    return { outcome: 'ignored', note: `No handler for event_type '${eventType}'` };
  }
  return handler(accountId, payload);
}
