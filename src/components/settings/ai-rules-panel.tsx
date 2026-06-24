'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';

interface RulesRow {
  dos: string | null;
  donts: string | null;
  escalation_rule: string | null;
}

const EMPTY: RulesRow = {
  dos: '',
  donts: '',
  escalation_rule: '',
};

/**
 * "Regras da IA" — hard dos/don'ts and the human-handoff trigger.
 * Complements the free-form "Instruções personalizadas" field on the
 * OpenAI tab (that one stays as a generic catch-all); this is the
 * structured place for explicit rules. One row per account, upserted
 * on save.
 */
export function AiRulesPanel() {
  const supabase = createClient();
  const { accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RulesRow>(EMPTY);

  const fetchRules = useCallback(async () => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_rules')
        .select('dos, donts, escalation_rule')
        .eq('account_id', accountId)
        .maybeSingle();
      if (error) throw error;
      setForm(data ? { ...EMPTY, ...data } : EMPTY);
    } catch (err) {
      console.error('Falha ao carregar regras da IA:', err);
      toast.error('Falha ao carregar as regras da IA');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    if (authLoading) return;
    fetchRules();
  }, [authLoading, fetchRules]);

  function set<K extends keyof RulesRow>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!accountId) {
      toast.error('Seu perfil não está vinculado a uma conta.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('ai_rules').upsert(
        {
          account_id: accountId,
          dos: form.dos?.trim() || null,
          donts: form.donts?.trim() || null,
          escalation_rule: form.escalation_rule?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' },
      );
      if (error) throw error;
      toast.success('Regras da IA salvas');
    } catch (err) {
      console.error('Erro ao salvar regras da IA:', err);
      toast.error('Falha ao salvar as regras da IA');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="max-w-3xl animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="Regras da IA"
          description="O que a IA sempre deve fazer, o que ela nunca deve fazer, e quando deve chamar um humano."
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-3xl animate-in fade-in-50 duration-200 space-y-6">
      <SettingsPanelHead
        title="Regras da IA"
        description="O que a IA sempre deve fazer, o que ela nunca deve fazer, e quando deve chamar um humano."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Limites do comportamento da IA
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Mesmo com regras, a IA do Inbox só sugere — quem decide enviar é sempre o atendente humano.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Sempre</Label>
            <Textarea
              value={form.dos ?? ''}
              onChange={(e) => set('dos', e.target.value)}
              placeholder="ex: Tratar o cliente pelo nome; confirmar o melhor horário de contato."
              rows={2}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Nunca</Label>
            <Textarea
              value={form.donts ?? ''}
              onChange={(e) => set('donts', e.target.value)}
              placeholder="ex: Prometer descontos não autorizados; garantir prazos não confirmados pela equipe."
              rows={2}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Transferir para um humano quando</Label>
            <Textarea
              value={form.escalation_rule ?? ''}
              onChange={(e) => set('escalation_rule', e.target.value)}
              placeholder="ex: O cliente reclamar, pedir reembolso, ou fizer uma pergunta fora do que a empresa oferece."
              rows={2}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar'
        )}
      </Button>
    </section>
  );
}
