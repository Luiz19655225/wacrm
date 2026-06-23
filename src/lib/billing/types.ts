// ============================================================
// Billing layer types — Asaas-shaped, kept separate from the
// app's own `AccountSubscription` (src/types/index.ts) so a future
// second provider doesn't need to reshape our DB columns, only add
// another file like this one next to asaas-client.ts.
// ============================================================

/** Subset of the Asaas customer object fields we actually use. */
export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  cpfCnpj?: string;
  mobilePhone?: string;
}

export interface CreateAsaasCustomerArgs {
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
  /** Our account id, stored on the Asaas side as `externalReference`
   *  so a webhook payload can be traced back to an account without
   *  a second lookup table. */
  externalReference: string;
}

/** Subset of the Asaas subscription object fields we actually use. */
export interface AsaasSubscription {
  id: string;
  customer: string;
  status: AsaasSubscriptionStatus;
  cycle: 'MONTHLY';
  value: number;
  nextDueDate: string;
  /** Present once Asaas has captured at least one charge attempt. */
  billingType?: string;
}

export type AsaasSubscriptionStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'OVERDUE'
  | 'INACTIVE';

export interface CreateAsaasSubscriptionArgs {
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY';
  externalReference: string;
}

/**
 * Asaas webhook envelope shape — the `event` field is the raw
 * provider event name (e.g. "PAYMENT_RECEIVED"); `payment` /
 * `subscription` carry whichever object the event is about. Kept
 * loose (`Record<string, unknown>`) for the nested objects since we
 * only read a handful of fields and don't want this type to drift
 * out of sync with Asaas's actual schema.
 */
export interface AsaasWebhookPayload {
  event: string;
  payment?: Record<string, unknown>;
  subscription?: Record<string, unknown>;
  [key: string]: unknown;
}
