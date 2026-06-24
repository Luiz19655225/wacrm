'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, HelpCircle, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { SettingsPanelHead } from './settings-panel-head';
import type { AiFaq } from '@/types';

/**
 * "FAQ" — question/answer pairs the AI can draw on directly instead
 * of improvising. Mirrors quick-replies-manager.tsx's CRUD shape.
 */
export function AiFaqsPanel() {
  const supabase = createClient();
  const { user, accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<AiFaq[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AiFaq | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AiFaq | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!accountId) {
      setLoading(false);
      return;
    }
    fetchFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, accountId]);

  async function fetchFaqs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_faqs')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setFaqs((data as AiFaq[]) ?? []);
    } catch (err) {
      console.error('Falha ao buscar FAQ:', err);
      toast.error('Falha ao carregar a FAQ');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setQuestion('');
    setAnswer('');
    setFormOpen(true);
  }

  function openEdit(faq: AiFaq) {
    setEditing(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!question.trim()) {
      toast.error('Informe a pergunta');
      return;
    }
    if (!answer.trim()) {
      toast.error('Informe a resposta');
      return;
    }
    if (!user || !accountId) {
      toast.error('Seu perfil não está vinculado a uma conta.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('ai_faqs')
          .update({
            question: question.trim(),
            answer: answer.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Pergunta atualizada');
      } else {
        const { error } = await supabase.from('ai_faqs').insert({
          account_id: accountId,
          question: question.trim(),
          answer: answer.trim(),
        });
        if (error) throw error;
        toast.success('Pergunta criada');
      }
      setFormOpen(false);
      await fetchFaqs();
    } catch (err) {
      console.error('Erro ao salvar pergunta da FAQ:', err);
      toast.error('Falha ao salvar a pergunta');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('ai_faqs').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Pergunta excluída');
      setFaqs((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Erro ao excluir pergunta da FAQ:', err);
      toast.error('Falha ao excluir a pergunta');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="max-w-3xl animate-in fade-in-50 space-y-4 duration-200">
      <SettingsPanelHead
        title="FAQ"
        description="Perguntas frequentes que a IA deve responder exatamente como você definir."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nova pergunta
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <HelpCircle className="size-4 text-primary" />
            Perguntas frequentes
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Usado pela IA no Inbox e no widget do site antes de improvisar uma resposta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma pergunta ainda — crie a primeira acima.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {faqs.map((faq) => (
                <li
                  key={faq.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{faq.question}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(faq)}
                      aria-label="Editar pergunta"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(faq)}
                      aria-label="Excluir pergunta"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar pergunta' : 'Nova pergunta'}</DialogTitle>
            <DialogDescription>
              A IA responde com este texto quando o cliente perguntar algo parecido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Pergunta
              </label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="ex: Vocês têm período de teste gratuito?"
                rows={2}
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Resposta
              </label>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="ex: Sim, oferecemos 30 dias de teste gratuito, sem cartão de crédito."
                rows={4}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir pergunta</DialogTitle>
            <DialogDescription>
              Excluir esta pergunta da FAQ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
