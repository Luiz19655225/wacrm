// ============================================================
// Pure status helpers — no I/O, unit-testable. Single source of
// truth for how trial_status + subscription_status collapse into
// the one access_status value the app would gate on.
//
// Phase 1 note: nothing calls `computeAccessStatus` to actually
// deny access yet. It exists so the billing webhook handler (phase
// 2) and any future enforcement code share one definition instead
// of each re-deriving the same logic slightly differently.
// ============================================================

import type {
  AccessStatus,
  SubscriptionStatus,
  TrialStatus,
} from '@/types';

export function computeAccessStatus(
  trialStatus: TrialStatus,
  subscriptionStatus: SubscriptionStatus,
): AccessStatus {
  if (subscriptionStatus === 'canceled') return 'canceled';
  if (subscriptionStatus === 'past_due') return 'past_due';
  if (trialStatus === 'active') return 'trial';
  if (trialStatus === 'expired' && subscriptionStatus !== 'active') {
    return 'blocked';
  }
  return 'active';
}

/** True once `trial_ends_at` has passed, regardless of what the
 *  stored `trial_status` still says — used as a read-time fallback
 *  so an expired trial reads correctly even before any cron/webhook
 *  has had a chance to flip the stored column (phase 2). */
export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() < Date.now();
}

/**
 * Maps Asaas's own subscription status vocabulary onto ours.
 * Asaas: ACTIVE | EXPIRED | OVERDUE | INACTIVE.
 * Ours:  active  | canceled | past_due | canceled.
 */
export function normalizeAsaasSubscriptionStatus(
  asaasStatus: string,
): SubscriptionStatus {
  switch (asaasStatus) {
    case 'ACTIVE':
      return 'active';
    case 'OVERDUE':
      return 'past_due';
    case 'EXPIRED':
    case 'INACTIVE':
      return 'canceled';
    default:
      return 'past_due';
  }
}

/**
 * Maps a raw Asaas webhook `event` string to our normalized
 * `billing_events.event_type`. Falls back to a lowercased copy of
 * the raw value for any event we don't explicitly recognize yet —
 * so an unmapped event is still recorded for later analysis instead
 * of being dropped.
 */
export function normalizeAsaasEventType(rawEvent: string): string {
  const known: Record<string, string> = {
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_CONFIRMED: 'payment_confirmed',
    PAYMENT_OVERDUE: 'payment_overdue',
    PAYMENT_DELETED: 'payment_deleted',
    PAYMENT_REFUNDED: 'payment_refunded',
    SUBSCRIPTION_CANCELED: 'subscription_canceled',
  };
  return known[rawEvent] ?? rawEvent.toLowerCase();
}
