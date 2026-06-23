-- ============================================================
-- 024_billing_plans
--
-- Foundation layer (phase 1 of the plans/trial/billing rollout).
-- This migration only adds a new, standalone catalog table. It
-- does not touch `accounts`, `profiles`, or any existing table.
--
-- `plans` is a small, slow-changing catalog (3 rows expected:
-- START/PRO/SCALE) that every account's subscription will
-- reference by `code`. Differences between plans live entirely in
-- the limit/feature columns here — connection type (QR Code vs
-- Meta API) is an `account_connections` concern, not a plan
-- concern, by product decision: every plan supports both.
--
-- `public_name` / `public_description` are split from `name` /
-- `description` so a future pricing page can show friendlier
-- marketing copy without renaming the internal catalog row (which
-- other tables reference by `code`, not by display name).
--
-- No seed data here on purpose — real prices/limits are a business
-- decision, not something to hardcode in a migration. See
-- `supabase/seed/plans_seed.sql`, which you edit and run by hand.
--
-- Re-runnable by design: every statement below is safe to execute
-- again against a database that already has some (but not all) of
-- this applied — CREATE TABLE IF NOT EXISTS, the DO-guarded ADD
-- CONSTRAINT blocks, ENABLE ROW LEVEL SECURITY (a no-op if already
-- on), and DROP POLICY IF EXISTS + CREATE POLICY are each
-- individually idempotent. That matters here because this table was
-- first created by hand (its core columns only) before this file's
-- CHECK constraints / RLS / policy were applied — re-running the
-- whole file now must not error on what already exists.
-- ============================================================

-- Defensive: uuid_generate_v4() (used for the `id` default below)
-- comes from this extension. 001_initial_schema.sql already creates
-- it, but recreating it here too — IF NOT EXISTS, so harmless if it
-- already exists — removes one possible reason CREATE TABLE could
-- fail on a project/schema where it didn't resolve.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  -- Public-facing copy, separate from the internal name/description
  -- above so pricing-page wording can change without touching the
  -- stable `code` other tables reference.
  public_name TEXT,
  public_description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  max_team_members INTEGER,
  max_connections INTEGER,
  max_automations INTEGER,
  max_contacts INTEGER,
  -- List of enabled feature keys for this plan (e.g. ["qr_code",
  -- "meta_api", "priority_support"]) — a flat array, not a
  -- key/value bag, so a plan's feature set is "is X in the list"
  -- rather than "is X true in the object".
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Postgres has no `ADD CONSTRAINT IF NOT EXISTS` — these DO blocks
-- are the standard idempotent substitute: try to add it, and if it
-- already exists (SQLSTATE 42710 / duplicate_object), do nothing
-- instead of erroring out and aborting the rest of the script.
DO $$
BEGIN
  ALTER TABLE plans
    ADD CONSTRAINT plans_code_format CHECK (code ~ '^[a-z0-9_]+$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE plans
    ADD CONSTRAINT plans_price_cents_non_negative CHECK (price_cents >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans are a read-only catalog from the app's point of view: any
-- authenticated user can see what's on offer (needed for the plan
-- picker), but only service-role (admin tooling / future internal
-- screen) can create or edit rows.
DROP POLICY IF EXISTS plans_select ON plans;
CREATE POLICY plans_select ON plans FOR SELECT
  TO authenticated
  USING (true);
