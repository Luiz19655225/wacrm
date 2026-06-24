'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetMessage {
  id: string;
  from: 'visitor' | 'bot';
  text: string;
}

const STORAGE_KEY = 'wavon_site_widget_session';

interface StoredSession {
  conversationId: string;
  name: string;
  phone: string;
  messages: WidgetMessage[];
}

function loadSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage unavailable (private mode etc.) — the widget still
    // works within the page lifetime, it just won't survive a reload.
  }
}

// Routes where the widget never renders — the authed dashboard already
// has a real Inbox + human agents; showing the visitor-facing widget
// there would be confusing noise, not a feature.
const HIDDEN_PATH_PREFIXES = [
  '/dashboard',
  '/inbox',
  '/contacts',
  '/pipelines',
  '/broadcasts',
  '/automations',
  '/flows',
  '/settings',
  '/login',
  '/signup',
  '/forgot-password',
  '/join',
];

/**
 * Floating AI attendant for WAVON's own public site (not a per-
 * customer embeddable product — see src/lib/site-widget/owner-account.ts).
 * First message collects name + WhatsApp + message; the CRM creates the
 * contact/conversation/lead server-side and every reply after that is a
 * normal back-and-forth in the same thread, visible in the real Inbox.
 */
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setConversationId(session.conversationId);
      setName(session.name);
      setPhone(session.phone);
      setMessages(session.messages);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const hidden = HIDDEN_PATH_PREFIXES.some((p) => pathname?.startsWith(p));
  if (hidden) return null;

  async function handleSubmit() {
    const trimmedText = text.trim();
    if (!trimmedText || sending) return;

    const isFirstMessage = !conversationId;
    if (isFirstMessage && !name.trim()) {
      toast.error('Informe seu nome');
      return;
    }
    if (isFirstMessage && !phone.trim()) {
      toast.error('Informe seu WhatsApp');
      return;
    }

    setSending(true);
    const visitorMsg: WidgetMessage = { id: `local-${Date.now()}`, from: 'visitor', text: trimmedText };
    setMessages((prev) => [...prev, visitorMsg]);
    setText('');

    try {
      const res = await fetch('/api/public/site-widget/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId || undefined,
          name: isFirstMessage ? name.trim() : undefined,
          phone: phone.trim(),
          message: trimmedText,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        toast.error(data.error || 'Falha ao enviar mensagem. Tente novamente.');
        // Keep the visitor's own bubble — only the reply failed.
        setSending(false);
        return;
      }

      const botMsg: WidgetMessage = {
        id: `bot-${Date.now()}`,
        from: 'bot',
        text: data.reply || 'Recebemos sua mensagem!',
      };
      setMessages((prev) => {
        const next = [...prev, botMsg];
        saveSession({ conversationId: data.conversation_id, name, phone, messages: next });
        return next;
      });
      setConversationId(data.conversation_id);
    } catch (err) {
      console.error('[site-widget] send failed:', err);
      toast.error('Falha ao enviar mensagem. Verifique sua conexão.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-primary-foreground">Fale com a gente</p>
              <p className="text-xs text-primary-foreground/80">Resposta rápida por IA</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar chat"
              className="rounded-md p-1 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">
                Olá! Me diga seu nome, seu WhatsApp e como podemos ajudar.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.from === 'visitor' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
                      m.from === 'visitor'
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md bg-muted text-foreground',
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  digitando...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            {!conversationId && (
              <div className="mb-2 space-y-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Seu WhatsApp (com DDD)"
                  inputMode="tel"
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Digite sua mensagem..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={sending || !text.trim()}
                aria-label="Enviar mensagem"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fechar atendimento' : 'Abrir atendimento'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
