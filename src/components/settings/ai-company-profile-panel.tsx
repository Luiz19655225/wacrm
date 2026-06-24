'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';

interface ProfileRow {
  company_name: string | null;
  industry: string | null;
  description: string | null;
  target_audience: string | null;
  tone_of_voice: string | null;
  differentiators: string | null;
}

const EMPTY: ProfileRow = {
  company_name: '',
  industry: '',
  description: '',
  target_audience: '',
  tone_of_voice: '',
  differentiators: '',
};

/**
 * "Perfil da Empresa" — feeds the AI's system instructions (Inbox +
 * site widget) so it knows who it's representing. One row per
 * account, upserted on save — same shape as ai_settings.
 */
export function AiCompanyProfilePanel() {
  const supabase = createClient();
  const { accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileRow>(EMPTY);

  const fetchProfile = useCallback(async () => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_company_profile')
        .select('company_name, industry, description, target_audience, tone_of_voice, differentiators')
        .eq('account_id', accountId)
        .maybeSingle();
      if (error) throw error;
      setForm(data ? { ...EMPTY, ...data } : EMPTY);
    } catch (err) {
      console.error('Falha ao carregar perfil da empresa:', err);
      toast.error('Falha ao carregar o perfil da empresa');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    if (authLoading) return;
    fetchProfile();
  }, [authLoading, fetchProfile]);

  function set<K extends keyof ProfileRow>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!accountId) {
      toast.error('Seu perfil não está vinculado a uma conta.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('ai_company_profile').upsert(
        {
          account_id: accountId,
          company_name: form.company_name?.trim() || null,
          industry: form.industry?.trim() || null,
          description: form.description?.trim() || null,
          target_audience: form.target_audience?.trim() || null,
          tone_of_voice: form.tone_of_voice?.trim() || null,
          differentiators: form.differentiators?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' },
      );
      if (error) throw error;
      toast.success('Perfil da empresa salvo');
    } catch (err) {
      console.error('Erro ao salvar perfil da empresa:', err);
      toast.error('Falha ao salvar o perfil da empresa');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="max-w-3xl animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="Perfil da Empresa"
          description="Conte para a IA quem é sua empresa — ela usa isso em todas as respostas no Inbox e no widget do site."
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
        title="Perfil da Empresa"
        description="Conte para a IA quem é sua empresa — ela usa isso em todas as respostas no Inbox e no widget do site."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="size-4 text-primary" />
            Sobre a empresa
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Quanto mais completo, mais precisa a IA fica ao responder clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Nome da empresa</Label>
            <Input
              value={form.company_name ?? ''}
              onChange={(e) => set('company_name', e.target.value)}
              placeholder="ex: WAVON"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Segmento de atuação</Label>
            <Input
              value={form.industry ?? ''}
              onChange={(e) => set('industry', e.target.value)}
              placeholder="ex: CRM e atendimento via WhatsApp"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Sobre a empresa</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descreva em poucas frases o que a empresa faz e como ajuda os clientes."
              rows={3}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Público-alvo</Label>
            <Textarea
              value={form.target_audience ?? ''}
              onChange={(e) => set('target_audience', e.target.value)}
              placeholder="ex: Pequenos empresários que querem automatizar o atendimento no WhatsApp."
              rows={2}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Tom de voz</Label>
            <Textarea
              value={form.tone_of_voice ?? ''}
              onChange={(e) => set('tone_of_voice', e.target.value)}
              placeholder="ex: Cordial, direto e confiante, sem gírias."
              rows={2}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Diferenciais</Label>
            <Textarea
              value={form.differentiators ?? ''}
              onChange={(e) => set('differentiators', e.target.value)}
              placeholder="ex: Implantação em 1 dia, suporte humano sempre disponível."
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
