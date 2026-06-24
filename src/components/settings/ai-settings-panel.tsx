'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsPanelHead } from './settings-panel-head';

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini (recomendado — mais rápido e barato)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
];

interface AiConfigState {
  configured: boolean;
  masked_key: string | null;
  default_model: string;
  custom_system_prompt: string | null;
  connection_status: 'not_configured' | 'connected' | 'error';
  last_tested_at: string | null;
  last_error: string | null;
}

/**
 * "IA / OpenAI" settings card — every account brings its own OpenAI
 * key (never a global system key). Mirrors the WhatsAppConfig UX:
 * masked secret re-entered to change it, a live "Testar conexão"
 * action, and a destructive "Remover chave" once configured.
 */
export function AiSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [config, setConfig] = useState<AiConfigState | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [model, setModel] = useState('gpt-4o-mini');
  const [customPrompt, setCustomPrompt] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/config');
      const data: AiConfigState = await res.json();
      setConfig(data);
      setModel(data.default_model || 'gpt-4o-mini');
      setCustomPrompt(data.custom_system_prompt || '');
      setApiKey(data.masked_key || '');
      setKeyEdited(false);
    } catch (err) {
      console.error('Falha ao carregar configuração de IA:', err);
      toast.error('Falha ao carregar a configuração de IA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleSave() {
    if (!config?.configured && (!apiKey.trim() || !keyEdited)) {
      toast.error('Informe sua chave da OpenAI (começa com "sk-")');
      return;
    }

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        default_model: model,
        custom_system_prompt: customPrompt.trim() || null,
      };
      if (keyEdited && apiKey.trim() && apiKey !== config?.masked_key) {
        payload.api_key = apiKey.trim();
      }

      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Falha ao salvar configuração');
        return;
      }

      toast.success('Configuração de IA salva');
      await fetchConfig();
    } catch (err) {
      console.error('Erro ao salvar configuração de IA:', err);
      toast.error('Falha ao salvar configuração de IA');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    try {
      setTesting(true);
      const res = await fetch('/api/ai/config/test', { method: 'POST' });
      const data = await res.json();

      if (data.connected) {
        toast.success('Conexão com a OpenAI bem-sucedida');
      } else {
        toast.error(data.error || 'Falha na conexão com a OpenAI');
      }
      await fetchConfig();
    } catch (err) {
      console.error('Erro ao testar conexão com a OpenAI:', err);
      toast.error('Falha no teste de conexão. Verifique a rede e tente novamente.');
    } finally {
      setTesting(false);
    }
  }

  async function handleRemove() {
    if (!confirm('Isso remove a chave da OpenAI salva para esta conta. Os recursos de IA deixarão de funcionar até uma nova chave ser salva. Continuar?')) {
      return;
    }
    try {
      setRemoving(true);
      const res = await fetch('/api/ai/config', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Falha ao remover a chave');
        return;
      }
      toast.success('Chave da OpenAI removida');
      setApiKey('');
      setKeyEdited(false);
      await fetchConfig();
    } catch (err) {
      console.error('Erro ao remover chave da OpenAI:', err);
      toast.error('Falha ao remover a chave');
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <section className="max-w-3xl animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="IA / OpenAI"
          description="Conecte a chave da OpenAI desta conta para habilitar sugestões de resposta, resumos e o atendente IA do site."
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  const status = config?.connection_status ?? 'not_configured';

  return (
    <section className="max-w-3xl animate-in fade-in-50 duration-200 space-y-6">
      <SettingsPanelHead
        title="IA / OpenAI"
        description="Cada conta usa a própria chave da OpenAI — o WAVON nunca compartilha uma chave global entre clientes. A chave nunca é exibida novamente após salva."
      />

      {/* Connection Status */}
      <Alert className="bg-card border-border">
        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <CheckCircle2 className="size-4 text-primary" />
          ) : (
            <XCircle className="size-4 text-red-500" />
          )}
          <AlertTitle className="text-foreground mb-0">
            {status === 'connected'
              ? 'Conectado'
              : status === 'error'
                ? 'Erro na conexão'
                : 'Não configurado'}
          </AlertTitle>
        </div>
        <AlertDescription className="text-muted-foreground">
          {status === 'connected' && config?.last_tested_at
            ? `Última verificação: ${new Date(config.last_tested_at).toLocaleString('pt-BR')}`
            : status === 'error'
              ? config?.last_error || 'A OpenAI rejeitou a chave salva.'
              : 'Salve sua chave da OpenAI abaixo para habilitar os recursos de IA.'}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="size-4 text-primary" />
            Credenciais da OpenAI
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Gere uma chave em platform.openai.com → API keys e cole abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">API Key da OpenAI</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setKeyEdited(true);
                }}
                onFocus={() => {
                  if (config?.configured && apiKey === config.masked_key) {
                    setApiKey('');
                    setKeyEdited(true);
                  }
                }}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {config?.configured && !keyEdited && (
              <p className="text-xs text-muted-foreground">
                A chave fica oculta por segurança. Digite-a novamente para trocá-la.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Modelo padrão</Label>
            <Select value={model} onValueChange={(val) => setModel(val ?? 'gpt-4o-mini')}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Instruções personalizadas <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              placeholder="ex: Responda sempre em tom cordial e objetivo, mencionando que a equipe confirma em até 1 hora útil."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Usado como contexto extra em sugestões de resposta, resumos e no atendente do site.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={testing || !config?.configured}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {testing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <Zap className="size-4" />
              Testar conexão
            </>
          )}
        </Button>
        {config?.configured && (
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={removing}
            className="border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40"
          >
            {removing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Remover chave
              </>
            )}
          </Button>
        )}
      </div>
    </section>
  );
}
