-- ============================================================
-- plans_seed.sql — NOT a migration. Not run automatically by
-- `supabase db push` or any deploy step.
--
-- Real commercial values for the 3 plans (START / PRO / SCALE),
-- reviewed and provided directly. Run by hand (Supabase SQL editor
-- or `psql`) as step 6 of the Phase 1 application plan, after
-- migrations 024-028.
--
-- Safe to re-run: ON CONFLICT (code) DO UPDATE keeps this
-- idempotent, so adjusting a value and re-running just updates the
-- existing row instead of erroring on the UNIQUE(code) constraint.
--
-- All 3 plans support both QR_CODE and META_API connections — that
-- is an account_connections-level choice, not a plan column. The
-- only difference between plans is in the limit/feature columns
-- below.
-- ============================================================

INSERT INTO public.plans (
  code, name, public_name, description, public_description,
  price_cents, currency, max_team_members, max_connections,
  max_automations, max_contacts, features, is_active, sort_order
)
VALUES
(
  'start',
  'WAVON Start',
  'Start',
  'Plano de entrada para pequenas empresas que querem organizar atendimento e vendas no WhatsApp.',
  'Ideal para começar com atendimento no WhatsApp, CRM e automações básicas.',
  19700,
  'BRL',
  1,
  1,
  5,
  2000,
  '["qr_code", "meta_api", "shared_inbox", "contacts", "deals", "basic_automations", "basic_flows", "docs_access", "standard_support"]'::jsonb,
  true,
  1
),
(
  'pro',
  'WAVON Pro',
  'Pro',
  'Plano principal para empresas com equipe comercial e maior volume de atendimento.',
  'Para empresas que precisam de mais usuários, mais conexões e automações mais completas.',
  39700,
  'BRL',
  3,
  3,
  20,
  10000,
  '["qr_code", "meta_api", "shared_inbox", "contacts", "deals", "broadcasts", "templates", "advanced_automations", "advanced_flows", "docs_access", "priority_support"]'::jsonb,
  true,
  2
),
(
  'scale',
  'WAVON Scale',
  'Scale',
  'Plano para operações estruturadas, com múltiplos atendentes, mais volume e maior necessidade de controle.',
  'Para empresas em crescimento que precisam de escala, mais conexões, mais automações e suporte mais próximo.',
  79700,
  'BRL',
  10,
  10,
  100,
  50000,
  '["qr_code", "meta_api", "shared_inbox", "contacts", "deals", "broadcasts", "templates", "advanced_automations", "advanced_flows", "multi_connection", "onboarding_assisted", "priority_support"]'::jsonb,
  true,
  3
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  public_name = EXCLUDED.public_name,
  description = EXCLUDED.description,
  public_description = EXCLUDED.public_description,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  max_team_members = EXCLUDED.max_team_members,
  max_connections = EXCLUDED.max_connections,
  max_automations = EXCLUDED.max_automations,
  max_contacts = EXCLUDED.max_contacts,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
