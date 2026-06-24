'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Reply, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { QuickReply } from '@/types';

/** Keeps shortcuts predictable for the composer's "/" matcher — lowercase,
 *  no spaces, no leading slash (the composer adds that itself). */
function normalizeShortcut(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9_-]/g, '');
}

export function QuickRepliesManager() {
  const supabase = createClient();
  const { user, accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<QuickReply[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<QuickReply | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!accountId) {
      setLoading(false);
      return;
    }
    fetchReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, accountId]);

  async function fetchReplies() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .order('shortcut', { ascending: true });

      if (error) throw error;
      setReplies((data as QuickReply[]) ?? []);
    } catch (err) {
      console.error('Falha ao buscar respostas rápidas:', err);
      toast.error('Falha ao carregar respostas rápidas');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setShortcut('');
    setContent('');
    setFormOpen(true);
  }

  function openEdit(reply: QuickReply) {
    setEditing(reply);
    setShortcut(reply.shortcut);
    setContent(reply.content);
    setFormOpen(true);
  }

  async function handleSave() {
    const normalized = normalizeShortcut(shortcut);
    if (!normalized) {
      toast.error('Informe um atalho (ex: pix)');
      return;
    }
    if (!content.trim()) {
      toast.error('Informe o texto da resposta');
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
          .from('quick_replies')
          .update({ shortcut: normalized, content: content.trim(), updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Resposta rápida atualizada');
      } else {
        const { error } = await supabase.from('quick_replies').insert({
          account_id: accountId,
          shortcut: normalized,
          content: content.trim(),
        });
        if (error) throw error;
        toast.success('Resposta rápida criada');
      }
      setFormOpen(false);
      await fetchReplies();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        toast.error(`Já existe uma resposta rápida com o atalho "/${normalized}"`);
      } else {
        console.error('Erro ao salvar resposta rápida:', err);
        toast.error('Falha ao salvar resposta rápida');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Resposta rápida excluída');
      setReplies((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Erro ao excluir resposta rápida:', err);
      toast.error('Falha ao excluir resposta rápida');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="max-w-3xl animate-in fade-in-50 space-y-4 duration-200">
      <SettingsPanelHead
        title="Respostas rápidas"
        description="Atalhos de texto para agilizar o atendimento. Digite &quot;/&quot; seguido do atalho no campo de mensagem do Inbox para inserir o texto."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nova resposta rápida
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Reply className="size-4 text-primary" />
            Seus atalhos
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Exemplos: /pix, /obrigado, /atendimento, /horario, /proposta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma resposta rápida ainda — crie a primeira acima.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {replies.map((reply) => (
                <li
                  key={reply.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      /{reply.shortcut}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {reply.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(reply)}
                      aria-label={`Editar /${reply.shortcut}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(reply)}
                      aria-label={`Excluir /${reply.shortcut}`}
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
            <DialogTitle>{editing ? 'Editar resposta rápida' : 'Nova resposta rápida'}</DialogTitle>
            <DialogDescription>
              O atalho é usado digitando &quot;/&quot; + o atalho no Inbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Atalho
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="pix"
                  maxLength={30}
                  disabled={saving}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Texto da resposta
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite o texto que será inserido no campo de mensagem..."
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
            <DialogTitle>Excluir resposta rápida</DialogTitle>
            <DialogDescription>
              Excluir o atalho &quot;/{deleteTarget?.shortcut}&quot;? Esta ação não pode ser
              desfeita.
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
