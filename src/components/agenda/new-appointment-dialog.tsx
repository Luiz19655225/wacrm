"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Search, UserPlus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ContactRow {
  id: string
  name: string | null
  phone: string
  email: string | null
  company: string | null
}

interface NewAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const DURATION_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '1h 30min', value: 90 },
  { label: '2 horas', value: 120 },
]

function getDefaultDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getNextRoundHour(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  onCreated,
}: NewAppointmentDialogProps) {
  const supabase = createClient()

  // ── Contact state ────────────────────────────────────────────────────────────
  const [contactMode, setContactMode] = useState<'search' | 'new'>('search')
  const [searchQ, setSearchQ]         = useState('')
  const [results, setResults]         = useState<ContactRow[]>([])
  const [searching, setSearching]     = useState(false)
  const [selected, setSelected]       = useState<ContactRow | null>(null)

  // Contact form fields (used for both "new" mode and display when selected)
  const [contactName, setContactName]       = useState('')
  const [contactPhone, setContactPhone]     = useState('')
  const [contactEmail, setContactEmail]     = useState('')
  const [contactCompany, setContactCompany] = useState('')

  // ── Appointment state ────────────────────────────────────────────────────────
  const [apptTitle, setApptTitle]       = useState('')
  const [apptDate, setApptDate]         = useState(getDefaultDate)
  const [apptTime, setApptTime]         = useState(getNextRoundHour)
  const [apptDuration, setApptDuration] = useState(60)
  const [apptReason, setApptReason]     = useState('')
  const [apptNotes, setApptNotes]       = useState('')

  const [loading, setLoading] = useState(false)

  // ── Reset when dialog opens ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setContactMode('search')
    setSearchQ('')
    setResults([])
    setSelected(null)
    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setContactCompany('')
    setApptTitle('')
    setApptDate(getDefaultDate())
    setApptTime(getNextRoundHour())
    setApptDuration(60)
    setApptReason('')
    setApptNotes('')
  }, [open])

  // ── Debounced contact search ─────────────────────────────────────────────────
  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, name, phone, email, company')
        .or(`name.ilike.%${searchQ}%,phone.ilike.%${searchQ}%`)
        .limit(6)
      setResults((data ?? []) as ContactRow[])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ])

  function selectContact(c: ContactRow) {
    setSelected(c)
    setContactName(c.name ?? '')
    setContactPhone(c.phone)
    setContactEmail(c.email ?? '')
    setContactCompany(c.company ?? '')
    if (!apptTitle && c.name) setApptTitle(`Atendimento - ${c.name}`)
    setResults([])
    setSearchQ('')
  }

  function clearContact() {
    setSelected(null)
    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setContactCompany('')
    setContactMode('search')
    setSearchQ('')
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const name  = selected ? (selected.name ?? contactName) : contactName
    const phone = selected ? selected.phone : contactPhone

    if (!name.trim())  { toast.error('Nome do cliente é obrigatório.'); return }
    if (!phone.trim()) { toast.error('Celular do cliente é obrigatório.'); return }
    if (!apptTitle.trim()) { toast.error('Título do compromisso é obrigatório.'); return }
    if (!apptDate || !apptTime) { toast.error('Data e hora são obrigatórios.'); return }

    const startLocal = new Date(`${apptDate}T${apptTime}:00`)
    if (isNaN(startLocal.getTime())) { toast.error('Data ou hora inválida.'); return }
    const endLocal = new Date(startLocal.getTime() + apptDuration * 60_000)

    setLoading(true)
    try {
      const res = await fetch('/api/agenda/appointments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id:      selected?.id,
          contact_name:    name.trim(),
          contact_phone:   phone.trim(),
          contact_email:   contactEmail.trim() || undefined,
          contact_company: contactCompany.trim() || undefined,
          title:           apptTitle.trim(),
          start_at:        startLocal.toISOString(),
          end_at:          endLocal.toISOString(),
          reason:          apptReason.trim() || undefined,
          notes:           apptNotes.trim() || undefined,
        }),
      })

      const data = await res.json() as {
        success?: boolean
        calendar_synced?: boolean
        online_meeting_url?: string | null
        error?: string
      }

      if (!res.ok) { toast.error(data.error ?? 'Erro ao criar compromisso.'); return }

      if (data.calendar_synced) {
        toast.success(
          data.online_meeting_url
            ? 'Compromisso criado e sincronizado com o Google Calendar!'
            : 'Compromisso criado e sincronizado com o Google Calendar.',
        )
      } else {
        toast.success('Compromisso salvo. Clique em "Sincronizar" para enviar ao Google Calendar.')
      }

      onOpenChange(false)
      onCreated()
    } catch {
      toast.error('Erro ao criar compromisso.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo compromisso</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-1">

          {/* ── Seção: Cliente ─────────────────────────────────────────────── */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cliente
            </h3>

            {/* Contact selected — read-only card */}
            {selected ? (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex flex-col gap-0.5 text-sm">
                  <span className="font-medium">{selected.name ?? '(sem nome)'}</span>
                  <span className="text-muted-foreground">{selected.phone}</span>
                  {selected.email   && <span className="text-muted-foreground">{selected.email}</span>}
                  {selected.company && <span className="text-muted-foreground">{selected.company}</span>}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={clearContact} aria-label="Remover contato">
                  <X className="size-4" />
                </Button>
              </div>
            ) : contactMode === 'search' ? (
              /* Search mode */
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    data-testid="contact-search"
                    placeholder="Buscar por nome ou celular..."
                    className="pl-8"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                  />
                </div>

                {searching && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Buscando...
                  </p>
                )}

                {results.length > 0 && (
                  <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                    {results.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectContact(c)}
                        className="flex flex-col px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{c.name ?? '(sem nome)'}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.phone}{c.email ? ` · ${c.email}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setContactMode('new')}
                  className="flex items-center gap-1.5 self-start text-sm text-primary hover:underline"
                >
                  <UserPlus className="size-3.5" />
                  Criar novo contato
                </button>
              </div>
            ) : (
              /* New contact form */
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-name">
                      Nome <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="new-name"
                      data-testid="new-contact-name"
                      placeholder="Nome completo"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-phone">
                      Celular <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="new-phone"
                      data-testid="new-contact-phone"
                      placeholder="(11) 99999-9999"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-email">E-mail</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="cliente@email.com"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-company">Empresa</Label>
                    <Input
                      id="new-company"
                      placeholder="Nome da empresa"
                      value={contactCompany}
                      onChange={e => setContactCompany(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setContactMode('search')
                    setContactName('')
                    setContactPhone('')
                    setContactEmail('')
                    setContactCompany('')
                  }}
                  className="self-start text-sm text-primary hover:underline"
                >
                  ← Buscar contato existente
                </button>
              </div>
            )}
          </section>

          {/* ── Seção: Compromisso ──────────────────────────────────────────── */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Compromisso
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appt-title">
                  Título <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="appt-title"
                  data-testid="appt-title"
                  placeholder="Ex: Atendimento - João Silva"
                  value={apptTitle}
                  onChange={e => setApptTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="appt-date">
                    Data <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="appt-date"
                    data-testid="appt-date"
                    type="date"
                    value={apptDate}
                    onChange={e => setApptDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="appt-time">
                    Hora <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="appt-time"
                    data-testid="appt-time"
                    type="time"
                    value={apptTime}
                    onChange={e => setApptTime(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="appt-duration">Duração</Label>
                  <select
                    id="appt-duration"
                    value={apptDuration}
                    onChange={e => setApptDuration(Number(e.target.value))}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {DURATION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appt-reason">Motivo</Label>
                <Input
                  id="appt-reason"
                  placeholder="Motivo do atendimento"
                  value={apptReason}
                  onChange={e => setApptReason(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appt-notes">Observações</Label>
                <Textarea
                  id="appt-notes"
                  placeholder="Observações adicionais..."
                  rows={2}
                  value={apptNotes}
                  onChange={e => setApptNotes(e.target.value)}
                  className="resize-none"
                />
              </div>
            </div>
          </section>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} data-testid="appt-submit">
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar compromisso'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
