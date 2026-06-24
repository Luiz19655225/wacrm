'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Package, Pencil, Trash2 } from 'lucide-react';
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
import type { AiProduct } from '@/types';

/**
 * "Produtos e Serviços" — what the AI is allowed to tell customers
 * exists, with what description and price. Mirrors quick-replies-
 * manager.tsx's CRUD shape exactly (dialog create/edit, delete
 * confirm, direct Supabase client + RLS).
 */
export function AiProductsPanel() {
  const supabase = createClient();
  const { user, accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<AiProduct[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AiProduct | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceInfo, setPriceInfo] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AiProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!accountId) {
      setLoading(false);
      return;
    }
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, accountId]);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_products')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setProducts((data as AiProduct[]) ?? []);
    } catch (err) {
      console.error('Falha ao buscar produtos:', err);
      toast.error('Falha ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setPriceInfo('');
    setFormOpen(true);
  }

  function openEdit(product: AiProduct) {
    setEditing(product);
    setName(product.name);
    setDescription(product.description ?? '');
    setPriceInfo(product.price_info ?? '');
    setFormOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome do produto ou serviço');
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
          .from('ai_products')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            price_info: priceInfo.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Produto atualizado');
      } else {
        const { error } = await supabase.from('ai_products').insert({
          account_id: accountId,
          name: name.trim(),
          description: description.trim() || null,
          price_info: priceInfo.trim() || null,
        });
        if (error) throw error;
        toast.success('Produto criado');
      }
      setFormOpen(false);
      await fetchProducts();
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      toast.error('Falha ao salvar produto');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('ai_products').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Produto excluído');
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      toast.error('Falha ao excluir produto');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="max-w-3xl animate-in fade-in-50 space-y-4 duration-200">
      <SettingsPanelHead
        title="Produtos e Serviços"
        description="O que a IA pode oferecer e explicar para os clientes, com descrição e preço."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Novo produto
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Package className="size-4 text-primary" />
            Catálogo
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Usado pela IA no Inbox e no widget do site para responder sobre o que a empresa vende.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto ainda — crie o primeiro acima.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{product.name}</span>
                      {product.price_info ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {product.price_info}
                        </span>
                      ) : null}
                    </div>
                    {product.description ? (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(product)}
                      aria-label={`Editar ${product.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(product)}
                      aria-label={`Excluir ${product.name}`}
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
            <DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
            <DialogDescription>
              A IA usa essas informações para responder sobre o que a empresa oferece.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Plano Pro"
                maxLength={120}
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Preço</label>
              <Input
                value={priceInfo}
                onChange={(e) => setPriceInfo(e.target.value)}
                placeholder="ex: R$397/mês"
                maxLength={120}
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Descrição
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que está incluso, para quem é indicado, etc."
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
            <DialogTitle>Excluir produto</DialogTitle>
            <DialogDescription>
              Excluir &quot;{deleteTarget?.name}&quot;? Esta ação não pode ser desfeita.
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
