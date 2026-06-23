// ============================================================
// Asaas REST client — phase 1 foundation.
//
// IMPORTANT: this file is structurally complete but has NOT been
// exercised against a real Asaas account in this environment — no
// `ASAAS_API_KEY` was available to test with. Treat every function
// here as "written, not verified" until it's been run once against
// a real (sandbox or production) Asaas account.
//
// Defaults to the Asaas SANDBOX host so an accidentally-configured
// key without an explicit ASAAS_API_URL can never hit production
// billing by mistake. Set ASAAS_API_URL explicitly to go live.
// ============================================================

import type {
  AsaasCustomer,
  AsaasCustomerList,
  AsaasSubscription,
  CreateAsaasCustomerArgs,
  CreateAsaasSubscriptionArgs,
  UpdateAsaasSubscriptionArgs,
} from './types';

const ASAAS_API_URL =
  process.env.ASAAS_API_URL ?? 'https://sandbox.asaas.com/api/v3';

export function isAsaasConfigured(): boolean {
  return Boolean(process.env.ASAAS_API_KEY);
}

class AsaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'AsaasError';
  }
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ASAAS_API_KEY is not set — billing integration is not configured yet.',
    );
  }

  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AsaasError(
      `Asaas request failed: ${res.status} ${path}`,
      res.status,
      body,
    );
  }
  return body as T;
}

export async function createAsaasCustomer(
  args: CreateAsaasCustomerArgs,
): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: args.name,
      email: args.email,
      cpfCnpj: args.cpfCnpj,
      mobilePhone: args.mobilePhone,
      externalReference: args.externalReference,
    }),
  });
}

export async function createAsaasSubscription(
  args: CreateAsaasSubscriptionArgs,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: args.customer,
      billingType: 'UNDEFINED',
      value: args.value,
      nextDueDate: args.nextDueDate,
      cycle: args.cycle,
      externalReference: args.externalReference,
    }),
  });
}

export async function getAsaasSubscription(
  subscriptionId: string,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`);
}

/**
 * Plan upgrade/downgrade on an already-created subscription. Only
 * touches `value` — no proration, no `updatePendingPayments` flag, so
 * a charge already generated for the current cycle is unaffected;
 * the new value applies starting with the next charge Asaas
 * generates from `nextDueDate`/`cycle`.
 */
export async function updateAsaasSubscription(
  subscriptionId: string,
  args: UpdateAsaasSubscriptionArgs,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    body: JSON.stringify({ value: args.value }),
  });
}

/**
 * Looks up a previously-created customer by our `externalReference`
 * (the account id) before creating a new one. Guards against a
 * duplicate Asaas customer if a prior plan-selection attempt created
 * one but failed before persisting `asaas_customer_id` on our side.
 * Returns null if none exists yet.
 */
export async function findAsaasCustomerByExternalReference(
  externalReference: string,
): Promise<AsaasCustomer | null> {
  const result = await asaasFetch<AsaasCustomerList>(
    `/customers?externalReference=${encodeURIComponent(externalReference)}`,
  );
  return result.data[0] ?? null;
}
