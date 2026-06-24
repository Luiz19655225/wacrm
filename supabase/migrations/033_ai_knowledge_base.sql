-- ============================================================
-- 033_ai_knowledge_base.sql
--
-- Fase 6 — IA treinável por empresa.
--
-- Five account-scoped tables that feed the AI's system instructions
-- (Inbox suggest/summarize/classify + the public site widget),
-- alongside the OpenAI key/model from ai_settings (032). Nothing here
-- ever leaves the account it belongs to: every table carries
-- account_id and is scoped through the same is_account_member() RLS
-- helper used everywhere else.
--
-- Write access is gated at 'admin' (not 'agent') because this content
-- shapes what the AI says on behalf of the whole company — pricing,
-- commercial goals, hard rules — the same sensitivity bar as the
-- OpenAI key itself (ai_settings). Read access stays open to any
-- member, same as ai_settings.
--
-- Single-row-per-account tables (ai_company_profile, ai_business_goals,
-- ai_rules) use UNIQUE(account_id) + upsert from the client, same shape
-- as ai_settings. List tables (ai_products, ai_faqs) are plain CRUD,
-- same shape as quick_replies.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. ai_company_profile — one row per account.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_company_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_name TEXT,
  industry TEXT,
  description TEXT,
  target_audience TEXT,
  tone_of_voice TEXT,
  differentiators TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id)
);

ALTER TABLE ai_company_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_company_profile_select ON ai_company_profile;
CREATE POLICY ai_company_profile_select ON ai_company_profile FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_company_profile_insert ON ai_company_profile;
CREATE POLICY ai_company_profile_insert ON ai_company_profile FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_company_profile_update ON ai_company_profile;
CREATE POLICY ai_company_profile_update ON ai_company_profile FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_company_profile_delete ON ai_company_profile;
CREATE POLICY ai_company_profile_delete ON ai_company_profile FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON ai_company_profile;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_company_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. ai_products — many rows per account.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_products_account ON ai_products(account_id, created_at);

ALTER TABLE ai_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_products_select ON ai_products;
CREATE POLICY ai_products_select ON ai_products FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_products_insert ON ai_products;
CREATE POLICY ai_products_insert ON ai_products FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_products_update ON ai_products;
CREATE POLICY ai_products_update ON ai_products FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_products_delete ON ai_products;
CREATE POLICY ai_products_delete ON ai_products FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON ai_products;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. ai_faqs — many rows per account.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_faqs_account ON ai_faqs(account_id, created_at);

ALTER TABLE ai_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_faqs_select ON ai_faqs;
CREATE POLICY ai_faqs_select ON ai_faqs FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_faqs_insert ON ai_faqs;
CREATE POLICY ai_faqs_insert ON ai_faqs FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_faqs_update ON ai_faqs;
CREATE POLICY ai_faqs_update ON ai_faqs FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_faqs_delete ON ai_faqs;
CREATE POLICY ai_faqs_delete ON ai_faqs FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON ai_faqs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. ai_business_goals — one row per account.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_business_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  primary_goal TEXT,
  secondary_goals TEXT,
  success_metrics TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id)
);

ALTER TABLE ai_business_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_business_goals_select ON ai_business_goals;
CREATE POLICY ai_business_goals_select ON ai_business_goals FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_business_goals_insert ON ai_business_goals;
CREATE POLICY ai_business_goals_insert ON ai_business_goals FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_business_goals_update ON ai_business_goals;
CREATE POLICY ai_business_goals_update ON ai_business_goals FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_business_goals_delete ON ai_business_goals;
CREATE POLICY ai_business_goals_delete ON ai_business_goals FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON ai_business_goals;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_business_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. ai_rules — one row per account.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  dos TEXT,
  donts TEXT,
  escalation_rule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id)
);

ALTER TABLE ai_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_rules_select ON ai_rules;
CREATE POLICY ai_rules_select ON ai_rules FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_rules_insert ON ai_rules;
CREATE POLICY ai_rules_insert ON ai_rules FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_rules_update ON ai_rules;
CREATE POLICY ai_rules_update ON ai_rules FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_rules_delete ON ai_rules;
CREATE POLICY ai_rules_delete ON ai_rules FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON ai_rules;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
