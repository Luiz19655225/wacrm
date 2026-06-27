"use client"

import { useState } from "react"
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
  Clock,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  User,
  Video,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  STATUS_COLOR,
  STATUS_LABEL,
  ORIGIN_LABEL,
  getDurationLabel,
  toLocalLabel,
  toLocalTime,
} from "@/lib/agenda/types"
import type { AppointmentWithContact } from "@/lib/agenda/types"

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

  const appt = appointment

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
        if (newStatus === "cancelled") onClose()
      }
    } finally {
      setLoading(false)
    }
  }

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

              {/* Status actions */}
              {appt.status !== "completed" && appt.status !== "cancelled" && (
                <div className="flex gap-2">
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
              {appt.status === "scheduled" && (
                <Button
                  size="sm"
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
