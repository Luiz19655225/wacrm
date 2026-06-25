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

const SELECT_COLUMNS =
  'id, account_id, file_name, file_type, file_size_bytes, status, error_message, chunk_count, char_count, page_count, embedding_model, embedding_tokens, processing_duration_ms, created_at';

// Transitional states a document passes through between the upload
// responding and the row reaching 'ready'/'error'. 'processing' is
// kept here too purely for backward compatibility with any row stuck
// in that pre-Fase-7.1 state — new uploads never write it anymore.
const TRANSIENT_STATUSES: AiDocument['status'][] = ['processing', 'extracting', 'embedding', 'indexing'];

function isTransient(status: AiDocument['status']): boolean {
  return TRANSIENT_STATUSES.includes(status);
}

const STATUS_LABEL: Record<AiDocument['status'], string> = {
  processing: 'Processando',
  extracting: 'Extraindo texto...',
  embedding: 'Gerando embeddings...',
  indexing: 'Indexando...',
  ready: 'Pronto',
  error: 'Erro',
};

// Polling interval while a document is in a transient status. Stops
// immediately (no residual timer) the moment the row reaches
// 'ready'/'error' — see pollDocument below.
const POLL_INTERVAL_MS = 1000;

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface DuplicatePrompt {
  file: File;
  existingDocument: { id: string; file_name: string };
}

/**
 * "Documentos" — Fase 7 (RAG) + Fase 7.1 (estabilização). Upload de
 * PDF/DOCX/PPTX/XLSX/TXT que a IA passa a consultar por busca
 * semântica antes de responder, em complemento (não substituição) às
 * outras abas estruturadas. Leitura é direto Supabase (RLS já libera
 * para qualquer membro, mesmo padrão de ai-products-panel.tsx);
 * upload/exclusão passam pela API porque exigem processamento
 * server-side (extração de texto + embeddings com a chave OpenAI da
 * conta).
 *
 * Fase 7.1: a rota de upload responde assim que o documento existe
 * (status 'extracting') e continua o processamento depois da
 * resposta (via `after()`); este painel consulta a linha a cada ~1s
 * apenas enquanto o status estiver em um estado transitório, parando
 * imediatamente ao chegar em 'ready'/'error'.
 */
export function AiDocumentsPanel() {
  const supabase = createClient();
  const { accountId, canEditSettings, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<AiDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePrompt | null>(null);

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

  // Stop every active poll on unmount — a closed panel must not keep
  // hitting Supabase in the background.
  useEffect(() => {
    const timers = pollTimers.current;
    return () => {
      timers.forEach((timer) => clearInterval(timer));
      timers.clear();
    };
  }, []);

  function stopPolling(documentId: string) {
    const timer = pollTimers.current.get(documentId);
    if (timer) {
      clearInterval(timer);
      pollTimers.current.delete(documentId);
    }
  }

  function pollDocument(documentId: string) {
    stopPolling(documentId);
    const timer = setInterval(async () => {
      const { data, error } = await supabase
        .from('ai_documents')
        .select(SELECT_COLUMNS)
        .eq('id', documentId)
        .maybeSingle();

      if (error || !data) {
        stopPolling(documentId);
        return;
      }

      const doc = data as AiDocument;
      setDocuments((prev) => prev.map((d) => (d.id === documentId ? doc : d)));

      if (!isTransient(doc.status)) {
        stopPolling(documentId);
        if (doc.status === 'error') {
          toast.error(doc.error_message || 'Falha ao processar o documento');
        } else if (doc.status === 'ready') {
          toast.success('Documento processado e pronto para uso pela IA');
        }
      }
    }, POLL_INTERVAL_MS);
    pollTimers.current.set(documentId, timer);
  }

  async function fetchDocuments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_documents')
        .select(SELECT_COLUMNS)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const docs = (data as AiDocument[]) ?? [];
      setDocuments(docs);
      // Resume polling for any document still mid-pipeline (e.g. the
      // page was refreshed while one was processing) so its status
      // keeps updating instead of looking permanently stuck.
      docs.filter((d) => isTransient(d.status)).forEach((d) => pollDocument(d.id));
    } catch (err) {
      console.error('Falha ao buscar documentos:', err);
      toast.error('Falha ao carregar os documentos');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelected(file: File, opts: { force?: boolean } = {}) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (opts.force) formData.append('force', 'true');

      const response = await fetch('/api/ai/knowledge-documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();

      if (response.status === 409 && body.duplicate) {
        setDuplicatePrompt({ file, existingDocument: body.existingDocument });
        return;
      }
      if (!response.ok) throw new Error(body.error || 'Falha ao enviar o documento');

      const doc = body.document as AiDocument;
      setDocuments((prev) => [doc, ...prev]);
      toast.success('Documento enviado — processando...');
      pollDocument(doc.id);
    } catch (err) {
      console.error('Erro ao enviar documento:', err);
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar o documento');
    } finally {
      setUploading(false);
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

      stopPolling(deleteTarget.id);
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
                  e.target.value = '';
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
                      <Badge variant={doc.status === 'ready' ? 'secondary' : doc.status === 'error' ? 'destructive' : 'outline'}>
                        {doc.status === 'ready' && <CheckCircle2 className="size-3" />}
                        {doc.status === 'error' && <AlertCircle className="size-3" />}
                        {isTransient(doc.status) && <Loader2 className="size-3 animate-spin" />}
                        {STATUS_LABEL[doc.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {doc.file_type.toUpperCase()}
                      {doc.file_size_bytes ? ` · ${formatBytes(doc.file_size_bytes)}` : ''}
                      {` · ${formatDate(doc.created_at)}`}
                    </p>
                    {doc.status === 'ready' && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {doc.chunk_count} trecho(s)
                        {doc.page_count ? ` · ${doc.page_count} página(s)` : ''}
                        {doc.char_count ? ` · ${doc.char_count.toLocaleString('pt-BR')} caracteres` : ''}
                        {doc.embedding_model ? ` · ${doc.embedding_model}` : ''}
                      </p>
                    )}
                    {doc.status === 'error' && doc.error_message && (
                      <p className="mt-0.5 text-xs text-destructive">{doc.error_message}</p>
                    )}
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

      <Dialog open={!!duplicatePrompt} onOpenChange={(open) => !open && setDuplicatePrompt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Documento idêntico já existe</DialogTitle>
            <DialogDescription>
              Já existe um documento idêntico (&quot;{duplicatePrompt?.existingDocument.file_name}&quot;)
              nesta conta. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDuplicatePrompt(null)}>
              Usar o documento existente
            </Button>
            <Button
              onClick={() => {
                const prompt = duplicatePrompt;
                setDuplicatePrompt(null);
                if (prompt) handleFileSelected(prompt.file, { force: true });
              }}
            >
              Enviar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
