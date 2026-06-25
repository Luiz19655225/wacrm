'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { AiDocument } from '@/types';

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.pptx,.xlsx,.csv,.txt';

const STATUS_LABEL: Record<AiDocument['status'], string> = {
  processing: 'Processando',
  ready: 'Pronto',
  error: 'Erro',
};

/**
 * "Documentos" — Fase 7 (RAG). Upload de PDF/DOCX/PPTX/XLSX/TXT que a
 * IA passa a consultar por busca semântica antes de responder, em
 * complemento (não substituição) às outras abas estruturadas. Leitura
 * é direto Supabase (RLS já libera para qualquer membro, mesmo padrão
 * de ai-products-panel.tsx); upload/exclusão passam pela API porque
 * exigem processamento server-side (extração de texto + embeddings
 * com a chave OpenAI da conta).
 */
export function AiDocumentsPanel() {
  const supabase = createClient();
  const { accountId, canEditSettings, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<AiDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AiDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!accountId) {
      setLoading(false);
      return;
    }
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, accountId]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_documents')
        .select('id, account_id, file_name, file_type, status, error_message, chunk_count, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments((data as AiDocument[]) ?? []);
    } catch (err) {
      console.error('Falha ao buscar documentos:', err);
      toast.error('Falha ao carregar os documentos');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelected(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/ai/knowledge-documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Falha ao enviar o documento');

      if (body.document?.status === 'error') {
        toast.error(body.document.error_message || 'Falha ao processar o documento');
      } else {
        toast.success('Documento enviado e processado');
      }
      await fetchDocuments();
    } catch (err) {
      console.error('Erro ao enviar documento:', err);
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar o documento');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/ai/knowledge-documents/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Falha ao excluir o documento');

      toast.success('Documento excluído');
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Erro ao excluir documento:', err);
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir o documento');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="max-w-3xl animate-in fade-in-50 space-y-4 duration-200">
      <SettingsPanelHead
        title="Documentos"
        description="Envie PDF, DOCX, PPTX, XLSX ou TXT — a IA passa a consultar o conteúdo desses arquivos antes de responder, além das outras abas."
        action={
          canEditSettings ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Enviar documento
              </Button>
            </>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="size-4 text-primary" />
            Documentos enviados
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Cada arquivo é dividido em trechos e indexado por busca semântica — a IA usa apenas os
            trechos relevantes para cada pergunta, não o documento inteiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum documento ainda — envie o primeiro acima.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                      <Badge
                        variant={
                          doc.status === 'ready'
                            ? 'secondary'
                            : doc.status === 'error'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {doc.status === 'ready' && <CheckCircle2 className="size-3" />}
                        {doc.status === 'error' && <AlertCircle className="size-3" />}
                        {doc.status === 'processing' && <Loader2 className="size-3 animate-spin" />}
                        {STATUS_LABEL[doc.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {doc.file_type.toUpperCase()}
                      {doc.status === 'ready' ? ` · ${doc.chunk_count} trecho(s)` : ''}
                      {doc.status === 'error' && doc.error_message ? ` · ${doc.error_message}` : ''}
                    </p>
                  </div>
                  {canEditSettings && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(doc)}
                      aria-label="Excluir documento"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir documento</DialogTitle>
            <DialogDescription>
              Excluir &quot;{deleteTarget?.file_name}&quot;? A IA deixa de consultá-lo imediatamente. Esta
              ação não pode ser desfeita.
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
