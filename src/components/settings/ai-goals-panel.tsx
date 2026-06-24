'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';

interface GoalsRow {
  primary_goal: string | null;
  secondary_goals: string | null;
  success_metrics: string | null;
}

const EMPTY: GoalsRow = {
  primary_goal: '',
  secondary_goals: '',
  success_metrics: '',
};

/**
 * "Objetivos Comerciais" — tells the AI what a "good" conversation
 * looks like for this account (the goal it should steer toward,
 * without ever auto-sending — see suggest-reply's human-in-the-loop
 * design). One row per account, upserted on save.
 */
export function AiGoalsPanel() {
  const supabase = createClient();
  const { accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<GoalsRow>(EMPTY);

  const fetchGoals = useCallback(async () => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_business_goals')
        .select('primary_goal, secondary_goals, success_metrics')
        .eq('account_id', accountId)
        .maybeSingle();
      if (error) throw error;
      setForm(data ? { ...EMPTY, ...data } : EMPTY);
    } catch (err) {
      console.error('Falha ao carregar objetivos comerciais:', err);
      toast.error('Falha ao carregar os objetivos comerciais');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    if (authLoading) return;
    fetchGoals();
  }, [authLoading, fetchGoals]);

  function set<K extends keyof GoalsRow>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!accountId) {
      toast.error('Seu perfil não está vinculado a uma conta.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('ai_business_goals').upsert(
        {
          account_id: accountId,
          primary_goal: form.primary_goal?.trim() || null,
          secondary_goals: form.secondary_goals?.trim() || null,
          success_metrics: form.success_metrics?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' },
      );
      if (error) throw error;
      toast.success('Objetivos comerciais salvos');
    } catch (err) {
      console.error('Erro ao salvar objetivos comerciais:', err);
      toast.error('Falha ao salvar os objetivos comerciais');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="max-w-3xl animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="Objetivos Comerciais"
          description="O que a IA deve buscar em cada conversa — usado para guiar sugestões de resposta e o atendente do site."
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
        title="Objetivos Comerciais"
        description="O que a IA deve buscar em cada conversa — usado para guiar sugestões de resposta e o atendente do site."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="size-4 text-primary" />
            Metas do atendimento
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            A IA nunca envia nada automaticamente — isso só orienta o tom e o direcionamento das respostas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Objetivo principal</Label>
            <Textarea
              value={form.primary_goal ?? ''}
              onChange={(e) => set('primary_goal', e.target.value)}
              placeholder="ex: Agendar uma demonstração com leads interessados."
              rows={2}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Objetivos secundários</Label>
            <Textarea
              value={form.secondary_goals ?? ''}
              onChange={(e) => set('secondary_goals', e.target.value)}
              placeholder="ex: Coletar o segmento do cliente; tirar dúvidas sobre preço sem fechar a venda."
              rows={2}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Como medir sucesso</Label>
            <Textarea
              value={form.success_metrics ?? ''}
              onChange={(e) => set('success_metrics', e.target.value)}
              placeholder="ex: Cliente aceitou agendar uma ligação ou pediu uma proposta."
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
