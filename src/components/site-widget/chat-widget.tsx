'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, X, Send, Loader2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetMessage {
  id: string;
  from: 'visitor' | 'bot';
  text: string;
}

interface SchedulingSlot {
  startISO: string;
  endISO: string;
  label: string;
}

const STORAGE_KEY = 'wavon_site_widget_session';

interface StoredSession {
  conversationId: string;
  name: string;
  phone: string;
  email: string;
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
    // sessionStorage unavailable (private mode etc.)
  }
}

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

const SCHEDULING_KEYWORDS = [
  'horário', 'horarios', 'agendar', 'agendamento', 'agenda',
  'disponível', 'disponivel', 'disponíveis', 'disponiveis',
  'reunião', 'reuniao', 'consulta', 'atendimento', 'marcar',
];

function containsSchedulingKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return SCHEDULING_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Floating AI attendant for WAVON's own public site.
 * First message collects name + WhatsApp + email + message.
 * When the AI response contains scheduling keywords and the backend
 * returns available slots, slot-picker buttons appear inline.
 */
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [schedulingSlots, setSchedulingSlots] = useState<SchedulingSlot[]>([]);
  // Inline schedule-confirmation state
  const [scheduleSlot, setScheduleSlot] = useState<SchedulingSlot | null>(null);
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduleWhatsapp, setScheduleWhatsapp] = useState('');
  const [scheduleCreating, setScheduleCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setConversationId(session.conversationId);
      setName(session.name);
      setPhone(session.phone);
      setEmail(session.email ?? '');
      setMessages(session.messages);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, scheduleSlot]);

  const hidden = HIDDEN_PATH_PREFIXES.some((p) => pathname?.startsWith(p));
  if (hidden) return null;

  async function handleSubmit() {
    const trimmedText = text.trim();
    if (!trimmedText || sending) return;

    const isFirstMessage = !conversationId;
    if (isFirstMessage) {
      if (!name.trim()) { toast.error('Informe seu nome'); return; }
      if (!phone.trim()) { toast.error('Informe seu WhatsApp (com DDD)'); return; }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Informe um e-mail válido'); return;
      }
    }

    setSending(true);
    const visitorMsg: WidgetMessage = { id: `local-${Date.now()}`, from: 'visitor', text: trimmedText };
    setMessages((prev) => [...prev, visitorMsg]);
    setSchedulingSlots([]);
    setText('');

    try {
      const res = await fetch('/api/public/site-widget/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId || undefined,
          name: isFirstMessage ? name.trim() : undefined,
          phone: phone.trim(),
          email: isFirstMessage ? email.trim() : undefined,
          message: trimmedText,
        }),
      });
      const data = await res.json().catch(() => ({})) as {
        conversation_id?: string;
        reply?: string;
        error?: string;
        scheduling_slots?: SchedulingSlot[];
      };

      if (!res.ok || data.error) {
        toast.error(data.error || 'Falha ao enviar mensagem. Tente novamente.');
        setSending(false);
        return;
      }

      const botMsg: WidgetMessage = {
        id: `bot-${Date.now()}`,
        from: 'bot',
        text: data.reply || 'Recebemos sua mensagem!',
      };
      const newConvId = data.conversation_id ?? conversationId ?? '';
      setMessages((prev) => {
        const next = [...prev, botMsg];
        saveSession({ conversationId: newConvId, name, phone, email, messages: next });
        return next;
      });
      setConversationId(newConvId);

      // Show slot picker when the AI response contains scheduling keywords
      if (
        data.scheduling_slots?.length &&
        containsSchedulingKeyword(data.reply ?? '')
      ) {
        setSchedulingSlots(data.scheduling_slots);
        setScheduleWhatsapp(phone.trim());
      }
    } catch (err) {
      console.error('[site-widget] send failed:', err);
      toast.error('Falha ao enviar mensagem. Verifique sua conexão.');
    } finally {
      setSending(false);
    }
  }

  async function handleConfirmSchedule() {
    if (!scheduleSlot || !conversationId) return;
    if (!scheduleReason.trim()) { toast.error('Informe o motivo do atendimento'); return; }
    if (!scheduleWhatsapp.trim()) { toast.error('Informe o WhatsApp'); return; }

    setScheduleCreating(true);
    try {
      const res = await fetch('/api/public/site-widget/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          phone: phone.trim(),
          start_iso: scheduleSlot.startISO,
          end_iso: scheduleSlot.endISO,
          attendee_name: name.trim(),
          attendee_phone: phone.trim(),
          attendee_whatsapp: scheduleWhatsapp.trim(),
          attendee_email: email.trim(),
          reason: scheduleReason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        online_meeting_url?: string;
        confirmation?: string;
      };

      if (!res.ok || data.error) {
        toast.error(data.error || 'Falha ao criar agendamento.');
        return;
      }

      const confirmText = data.confirmation ?? `📅 Agendamento confirmado: ${scheduleSlot.label}.`;
      const botMsg: WidgetMessage = { id: `bot-sched-${Date.now()}`, from: 'bot', text: confirmText };
      setMessages((prev) => {
        const next = [...prev, botMsg];
        saveSession({ conversationId, name, phone, email, messages: next });
        return next;
      });

      setScheduleSlot(null);
      setSchedulingSlots([]);
      setScheduleReason('');
    } catch {
      toast.error('Falha ao criar agendamento. Tente novamente.');
    } finally {
      setScheduleCreating(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
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
                Olá! Me diga seu nome, WhatsApp, e-mail e como podemos ajudar.
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

            {/* Slot picker — shown when AI response mentions scheduling */}
            {schedulingSlots.length > 0 && !scheduleSlot && (
              <div className="rounded-xl border border-border bg-muted/60 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Horários disponíveis
                </p>
                {schedulingSlots.map((slot) => (
                  <button
                    key={slot.startISO}
                    type="button"
                    onClick={() => { setScheduleSlot(slot); setScheduleReason(''); }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}

            {/* Inline schedule confirmation form */}
            {scheduleSlot && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Confirmar: {scheduleSlot.label}
                </p>
                <div className="space-y-1.5">
                  <input
                    value={scheduleWhatsapp}
                    onChange={(e) => setScheduleWhatsapp(e.target.value)}
                    placeholder="WhatsApp (com DDD)"
                    inputMode="tel"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/60"
                  />
                  <input
                    value={scheduleReason}
                    onChange={(e) => setScheduleReason(e.target.value)}
                    placeholder="Motivo do atendimento"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/60"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleSlot(null)}
                    className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSchedule}
                    disabled={scheduleCreating}
                    className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {scheduleCreating ? (
                      <span className="flex items-center justify-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Agendando…
                      </span>
                    ) : 'Confirmar'}
                  </button>
                </div>
              </div>
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
                  placeholder="WhatsApp (com DDD)"
                  inputMode="tel"
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  type="email"
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
