-- ============================================================
-- 025_account_subscriptions
--
-- One-to-one billing/trial/access state per account. Deliberately
-- a separate table, not new columns on `accounts` — `accounts` is
-- the core multi-tenant table every other table FKs into, and this
-- migration does not touch it at all.
--
-- Three distinct status columns, by design:
--   - trial_status        the trial lifecycle on its own
--                          ('not_applicable' | 'active' | 'expired' | 'converted')
--   - subscription_status the raw billing-provider-shaped status
--                          ('trialing' | 'active' | 'past_due' | 'canceled')
--   - access_status        the single value the app would read to
--                          gate access ('trial' | 'active' | 'past_due'
--                          | 'blocked' | 'canceled' | 'read_only')
-- access_status is the computed/derived one; trial_status and
-- subscription_status are the raw inputs that feed it. Phase 1
-- only models and stores these — nothing in the app reads
-- access_status to deny access yet. That enforcement is a
-- deliberately separate, later phase.
--
-- Backfill: every account that exists before this migration gets a
-- row with access_status/subscription_status = 'active' and no
-- trial — they're grandfathered in with full access, exactly as
-- they have today. Only accounts created *after* this migration
-- (via the updated `handle_new_user`) start a real 30-day trial.
-- The backfill INSERT is idempotent (`WHERE NOT EXISTS`), safe to
-- re-run if this migration is ever replayed.
-- ============================================================

CREATE TABLE IF NOT EXISTS account_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  plan_code TEXT REFERENCES plans(code),

  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_status TEXT NOT NULL DEFAULT 'not_applicable',

  subscription_status TEXT NOT NULL DEFAULT 'active',
  access_status TEXT NOT NULL DEFAULT 'active',

  -- Current Asaas billing cycle window, mirrored from the provider
  -- subscription once billing is actually wired up (phase 2).
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  -- When the account asked to cancel (or was canceled by a failed
  -- payment past the grace period). Kept distinct from
  -- `subscription_status = 'canceled'` so "canceled but still has
  -- access until period end" is representable later.
  canceled_at TIMESTAMPTZ,
  -- End of the past-due grace window, if the product decides to
  -- grant one (phase 2 decision) — nullable/unused until then.
  grace_ends_at TIMESTAMPTZ,

  -- Next charge date as reported by Asaas. Display-only; not used
  -- for any gating logic.
  next_due_date DATE,

  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE account_subscriptions
  ADD CONSTRAINT account_subscriptions_trial_status_check
  CHECK (trial_status IN ('not_applicable', 'active', 'expired', 'converted'));

ALTER TABLE account_subscriptions
  ADD CONSTRAINT account_subscriptions_subscription_status_check
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled'));

ALTER TABLE account_subscriptions
  ADD CONSTRAINT account_subscriptions_access_status_check
  CHECK (access_status IN ('trial', 'active', 'past_due', 'blocked', 'canceled', 'read_only'));

CREATE INDEX IF NOT EXISTS idx_account_subscriptions_account ON account_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_subscriptions_plan ON account_subscriptions(plan_code);

ALTER TABLE account_subscriptions ENABLE ROW LEVEL SECURITY;

-- Every member of the account (viewer+) can see its own billing
-- status — that's just "what plan/trial am I on", not sensitive
-- the way payment instrument details would be. Nothing here stores
-- card data; Asaas does.
DROP POLICY IF EXISTS account_subscriptions_select ON account_subscriptions;
CREATE POLICY account_subscriptions_select ON account_subscriptions FOR SELECT
  USING (is_account_member(account_id));

-- No INSERT/UPDATE/DELETE policy for regular users on purpose: the
-- status columns are only ever written by the signup trigger
-- (below) or by service-role code (the Asaas webhook handler, the
-- plan-change endpoint). The Supabase service-role key bypasses
-- RLS entirely, so it does not need an explicit policy here.

-- ------------------------------------------------------------
-- Backfill: one grandfathered, fully-active row per existing
-- account. Idempotent — safe to re-run.
-- ------------------------------------------------------------
INSERT INTO account_subscriptions (account_id, trial_status, subscription_status, access_status)
SELECT a.id, 'not_applicable', 'active', 'active'
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM account_subscriptions s WHERE s.account_id = a.id
);

-- ------------------------------------------------------------
-- handle_new_user(): re-create with ONE new statement appended.
--
-- Everything above the new INSERT is byte-for-byte identical to
-- the function body from 017_account_sharing.sql — same
-- declarations, same two INSERTs (accounts, profiles), same
-- EXCEPTION handler. Diff this block against 017 before applying
-- if you want to double-check that claim.
--
-- The new INSERT starts a real 30-day trial for accounts created
-- from this point forward. It sits inside the same BEGIN block, so
-- if it ever fails for any reason, it's caught by the existing
-- `EXCEPTION WHEN OTHERS` — a billing-row hiccup must never block
-- someone from signing up and getting a working account.
--
-- CREATE OR REPLACE (no DROP) — the signature is unchanged, so the
-- existing trigger keeps pointing at this function with no gap.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_account_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.accounts (name, owner_user_id)
  VALUES (COALESCE(NULLIF(v_full_name, ''), NEW.email, 'My account'), NEW.id)
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner');

  INSERT INTO public.account_subscriptions (
    account_id, trial_status, trial_started_at, trial_ends_at,
    subscription_status, access_status
  )
  VALUES (
    v_account_id, 'active', now(), now() + INTERVAL '30 days',
    'trialing', 'trial'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
