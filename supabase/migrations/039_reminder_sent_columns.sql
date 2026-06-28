-- 039_reminder_sent_columns.sql
-- Fase 8.3 — Lembretes automáticos via cron
--
-- Três colunas de controle de envio (uma por janela de tempo):
--   NULL     = lembrete elegível para envio pelo cron
--   NOT NULL = lembrete enviado com sucesso — cron ignora o registro
--
-- Função claim_reminder_appointments: reserva atômica via CTE + FOR UPDATE SKIP LOCKED.
-- Previne que execuções concorrentes do cron enviem duplicatas para o mesmo compromisso.

-- ─── Colunas de dedup ────────────────────────────────────────────────────────

ALTER TABLE calendar_appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent_at   TIMESTAMPTZ;
ALTER TABLE calendar_appointments ADD COLUMN IF NOT EXISTS reminder_2h_sent_at    TIMESTAMPTZ;
ALTER TABLE calendar_appointments ADD COLUMN IF NOT EXISTS reminder_30min_sent_at TIMESTAMPTZ;

-- ─── Função de reserva atômica ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION claim_reminder_appointments(
  p_col   TEXT,
  p_lower TIMESTAMPTZ,
  p_upper TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id         UUID,
  account_id UUID,
  start_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_col NOT IN ('reminder_24h_sent_at', 'reminder_2h_sent_at', 'reminder_30min_sent_at') THEN
    RAISE EXCEPTION 'claim_reminder_appointments: coluna inválida: %', p_col;
  END IF;

  RETURN QUERY EXECUTE format($sql$
    WITH claimed AS (
      SELECT id FROM calendar_appointments
      WHERE %I IS NULL
        AND status IN ('scheduled', 'confirmed', 'rescheduled')
        AND comm_reminder_enabled = true
        AND start_at BETWEEN $1 AND $2
      ORDER BY start_at ASC
      LIMIT $3
      FOR UPDATE SKIP LOCKED
    )
    UPDATE calendar_appointments ca
    SET %I = NOW()
    FROM claimed
    WHERE ca.id = claimed.id
    RETURNING ca.id, ca.account_id, ca.start_at
  $sql$, p_col, p_col)
  USING p_lower, p_upper, p_limit;
END;
$$;
