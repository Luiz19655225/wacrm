"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  User,
  UserX,
  Video,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  COMM_CHANNEL_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  TERMINAL_STATUSES,
  ORIGIN_LABEL,
  getDurationLabel,
  relativeTime,
  toLocalLabel,
  toLocalTime,
} from "@/lib/agenda/types"
import type { AppointmentWithContact, CommChannel, CommLogEntry } from "@/lib/agenda/types"

interface AppointmentPanelProps {
  appointment: AppointmentWithContact | null
  timezone: string
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}

export function AppointmentPanel({
  appointment,
  timezone,
  onClose,
  onStatusChange,
}: AppointmentPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [commLog, setCommLog] = useState<CommLogEntry[]>([])

  // Communication preferences — local optimistic state
  const [commPrefs, setCommPrefs] = useState({
    comm_channel:               'whatsapp' as CommChannel,
    comm_confirmation_enabled:  true,
    comm_reminder_enabled:      true,
  })

  const appt = appointment

  // Load comm log and sync prefs when appointment changes
  useEffect(() => {
    if (!appt) {
      setCommLog([])
      return
    }

    setCommPrefs({
      comm_channel:               appt.comm_channel,
      comm_confirmation_enabled:  appt.comm_confirmation_enabled,
      comm_reminder_enabled:      appt.comm_reminder_enabled,
    })

    fetch(`/api/agenda/appointments/${appt.id}/comm-log`)
      .then(r => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries: CommLogEntry[] }) => setCommLog(data.entries))
      .catch(() => setCommLog([]))
  }, [appt?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(newStatus: string) {
    if (!appt) return
    setLoading(true)
    try {
      const res = await fetch(`/api/agenda/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        onStatusChange(appt.id, newStatus)
        // Re-fetch log after status change
        const logRes = await fetch(`/api/agenda/appointments/${appt.id}/comm-log`)
        if (logRes.ok) {
          const logData = await logRes.json() as { entries: CommLogEntry[] }
          setCommLog(logData.entries)
        }
        if (newStatus === "cancelled" || newStatus === "no_show") onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePrefChange(update: Partial<typeof commPrefs>) {
    if (!appt) return
    setCommPrefs(prev => ({ ...prev, ...update }))  // optimistic
    await fetch(`/api/agenda/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }).catch(() => { /* silent — pref update failure is non-critical */ })
  }

  const isTerminal = appt ? TERMINAL_STATUSES.includes(appt.status) : false
  const canConfirm = appt?.status === "scheduled" || appt?.status === "rescheduled"
  const canNoShow  = appt?.status === "scheduled" || appt?.status === "confirmed"
  const canComplete = appt?.status === "scheduled" || appt?.status === "confirmed" || appt?.status === "rescheduled"

  return (
    <Sheet open={!!appt} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {appt && (
          <>
            <SheetHeader className="border-b border-border p-4 pb-4">
              <div className="flex items-start justify-between gap-2 pr-8">
                <div className="min-w-0">
                  <SheetTitle className="truncate">{appt.title}</SheetTitle>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        STATUS_COLOR[appt.status],
                      )}
                    >
                      {STATUS_LABEL[appt.status]}
                    </span>
                    {appt.origin && (
                      <span className="text-xs text-muted-foreground">
                        via {ORIGIN_LABEL[appt.origin] ?? appt.origin}
                      </span>
                    )}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5 p-4">
              {/* Date & time */}
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Horário
                </h3>
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                    <span>{toLocalLabel(appt.start_at, timezone)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                    <span>
                      {toLocalTime(appt.start_at, timezone)}
                      {" – "}
                      {toLocalTime(appt.end_at, timezone)}
                      <span
                        data-testid="appt-duration"
                        className="ml-2 text-xs text-muted-foreground"
                      >
                        ({getDurationLabel(appt.start_at, appt.end_at)})
                      </span>
                    </span>
                  </div>
                  {appt.online_meeting_url && (
                    <div className="flex items-center gap-2">
                      <Video className="size-4 shrink-0 text-muted-foreground" />
                      <a
                        href={appt.online_meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        Entrar na reunião
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* Contact info */}
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cliente
                </h3>
                {appt.contact ? (
                  <div className="flex flex-col gap-1.5 text-sm">
                    {appt.contact.name && (
                      <div className="flex items-center gap-2">
                        <User className="size-4 shrink-0 text-muted-foreground" />
                        <span>{appt.contact.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 shrink-0 text-muted-foreground" />
                      <span>{appt.contact.phone}</span>
                    </div>
                    {appt.contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{appt.contact.email}</span>
                      </div>
                    )}
                    {appt.contact.company && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                        <span>{appt.contact.company}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem contato vinculado</p>
                )}
              </section>

              {/* Reason / notes */}
              {(appt.reason || appt.notes) && (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Detalhes
                  </h3>
                  {appt.reason && (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Motivo:</span> {appt.reason}
                    </p>
                  )}
                  {appt.notes && (
                    <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                      {appt.notes}
                    </p>
                  )}
                </section>
              )}

              {/* Assigned user */}
              {appt.assigned_user?.full_name && (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Responsável
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="size-4 shrink-0 text-muted-foreground" />
                    <span>{appt.assigned_user.full_name}</span>
                  </div>
                </section>
              )}

              {/* Communication preferences */}
              <section data-testid="comm-prefs">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Comunicação
                </h3>
                <div className="flex flex-col gap-2">
                  {/* Channel preference */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Canal</span>
                    <select
                      value={commPrefs.comm_channel}
                      onChange={e => void handlePrefChange({ comm_channel: e.target.value as CommChannel })}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {(Object.entries(COMM_CHANNEL_LABEL) as [CommChannel, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  {/* Confirmation toggle */}
                  <label className="flex cursor-pointer items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enviar confirmação</span>
                    <input
                      type="checkbox"
                      checked={commPrefs.comm_confirmation_enabled}
                      onChange={e => void handlePrefChange({ comm_confirmation_enabled: e.target.checked })}
                      className="size-4 rounded accent-primary"
                    />
                  </label>
                  {/* Reminder toggle */}
                  <label className="flex cursor-pointer items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enviar lembrete</span>
                    <input
                      type="checkbox"
                      checked={commPrefs.comm_reminder_enabled}
                      onChange={e => void handlePrefChange({ comm_reminder_enabled: e.target.checked })}
                      className="size-4 rounded accent-primary"
                    />
                  </label>
                </div>
              </section>

              {/* Communication history */}
              {commLog.length > 0 && (
                <section data-testid="comm-log">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <History className="size-3.5" />
                    Histórico
                  </h3>
                  <ol className="flex flex-col gap-2">
                    {commLog.map(entry => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className="flex-1 text-foreground">{entry.message}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {relativeTime(entry.created_at)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            <SheetFooter className="border-t border-border p-4 flex flex-col gap-2">
              {/* CRM, Inbox & external calendar shortcuts */}
              <div className="flex flex-wrap gap-2">
                {appt.contact_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/contacts?id=${appt.contact_id}`)}
                  >
                    <ExternalLink className="size-3.5" />
                    Abrir CRM
                  </Button>
                )}
                {appt.conversation_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/inbox?conversation=${appt.conversation_id}`)}
                  >
                    <MessageSquare className="size-3.5" />
                    Conversa
                  </Button>
                )}
                {appt.provider_type === "GOOGLE" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid="open-gcal-btn"
                    onClick={() => window.open("https://calendar.google.com/", "_blank", "noreferrer")}
                  >
                    <ExternalLink className="size-3.5" />
                    Google Calendar
                  </Button>
                )}
              </div>

              {/* Quick confirm — scheduled or rescheduled */}
              {canConfirm && (
                <Button
                  size="sm"
                  disabled={loading}
                  data-testid="confirm-btn"
                  className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
                  onClick={() => handleStatusChange("confirmed")}
                >
                  <CheckCircle2 className="size-3.5" />
                  Confirmar presença
                </Button>
              )}

              {/* Secondary actions */}
              {!isTerminal && (
                <div className="flex flex-wrap gap-2">
                  {canNoShow && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      data-testid="noshow-btn"
                      className="flex-1"
                      onClick={() => handleStatusChange("no_show")}
                    >
                      <UserX className="size-3.5" />
                      Não compareceu
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => handleStatusChange("rescheduled")}
                  >
                    <RefreshCw className="size-3.5" />
                    Reagendar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => handleStatusChange("cancelled")}
                  >
                    <X className="size-3.5" />
                    Cancelar
                  </Button>
                </div>
              )}

              {/* Complete action */}
              {canComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleStatusChange("completed")}
                >
                  Marcar como Concluído
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
