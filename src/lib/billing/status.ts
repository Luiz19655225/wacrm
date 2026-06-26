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

/**
 * Days of grace after a payment goes overdue before the product
 * would consider tightening access further. Phase 2 only uses this
 * to set `grace_ends_at` for display in the banner — nothing reads
 * it to actually restrict anything yet (that's phase 3).
 */
export const PAST_DUE_GRACE_DAYS = 5;

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

export type AccessBannerTone = 'info' | 'warning' | 'danger';

export interface AccessBannerContent {
  tone: AccessBannerTone;
  title: string;
  message: string;
}

/**
 * Pure mapping from the account's current billing state to what a
 * non-blocking banner should say — no I/O, no DB write. Phase 2 only
 * ever uses this for display (src/components/billing/access-status-banner.tsx).
 * It's written so a future enforcement phase can reuse the exact
 * same classification to decide what to actually restrict, instead
 * of re-deriving the logic.
 *
 * Returns null when there's nothing worth telling the user (a
 * healthy `active` account with no trial in play).
 *
 * `accessStatus`/`trialStatus` are the stored columns; `trialEndsAt`
 * is read-time-checked via `isTrialExpired` so a trial that ran out
 * before any subscription/webhook ever touched the row (nobody
 * picked a plan) still surfaces correctly without a cron job.
 */
export function describeAccessStatus(input: {
  accessStatus: AccessStatus;
  trialStatus: TrialStatus;
  trialEndsAt: string | null;
  nextDueDate: string | null;
}): AccessBannerContent | null {
  const { accessStatus, trialStatus, trialEndsAt, nextDueDate } = input;

  if (trialStatus === 'active' && isTrialExpired(trialEndsAt)) {
    return {
      tone: 'warning',
      title: 'Trial period has ended',
      message:
        'Your 30-day trial is over. Choose a plan to keep using WAVON without interruption.',
    };
  }

  switch (accessStatus) {
    case 'trial': {
      if (!trialEndsAt) return null;
      const daysLeft = Math.max(
        0,
        Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
      return {
        tone: 'info',
        title: 'Trial in progress',
        message:
          daysLeft > 0
            ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial.`
            : 'Your trial ends today.',
      };
    }
    case 'past_due':
      return {
        tone: 'warning',
        title: 'Payment overdue',
        message: nextDueDate
          ? `Your last charge (due ${nextDueDate}) hasn't been confirmed yet. Please check your payment method.`
          : "Your last charge hasn't been confirmed yet. Please check your payment method.",
      };
    case 'blocked':
      return {
        tone: 'danger',
        title: 'Access restricted',
        message: 'Your subscription is overdue. Choose a plan to restore full access.',
      };
    case 'canceled':
      return {
        tone: 'danger',
        title: 'Subscription canceled',
        message: 'Your subscription was canceled. Choose a plan to reactivate.',
      };
    case 'read_only':
      return {
        tone: 'warning',
        title: 'Read-only mode',
        message: 'Your account is in read-only mode. Choose a plan to restore full access.',
      };
    case 'active':
    default:
      return null;
  }
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
 *
 * Asaas subscription cancellation vocabulary:
 *   SUBSCRIPTION_INACTIVATED — subscription was inactivated/canceled
 *     (status becomes INACTIVE). This is the canonical cancel event.
 *   SUBSCRIPTION_DELETED — subscription was permanently deleted.
 *     Also terminates access; mapped to the same internal type.
 * Note: SUBSCRIPTION_CANCELED does not exist in the Asaas API.
 */
export function normalizeAsaasEventType(rawEvent: string): string {
  const known: Record<string, string> = {
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_CONFIRMED: 'payment_confirmed',
    PAYMENT_OVERDUE: 'payment_overdue',
    PAYMENT_DELETED: 'payment_deleted',
    PAYMENT_REFUNDED: 'payment_refunded',
    SUBSCRIPTION_INACTIVATED: 'subscription_canceled',
    SUBSCRIPTION_DELETED: 'subscription_canceled',
  };
  return known[rawEvent] ?? rawEvent.toLowerCase();
}
