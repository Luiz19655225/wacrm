"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TrendingUp, CalendarDays, MessageSquare, Users, Contact, Bot } from "lucide-react"
import { AnalyticsFilters, resolvePresetRange } from "./analytics-filters"
import type { DatePreset, DateRange } from "./analytics-filters"
import { ComercialTab } from "./tabs/comercial-tab"
import { AgendaTab } from "./tabs/agenda-tab"
import { ComunicacaoTab } from "./tabs/comunicacao-tab"
import { UsuariosTab } from "./tabs/usuarios-tab"
import { ClientesTab } from "./tabs/clientes-tab"
import { IaTab } from "./tabs/ia-tab"

const TABS = [
  { id: 'comercial',    label: 'Comercial',    Icon: TrendingUp    },
  { id: 'agenda',       label: 'Agenda',       Icon: CalendarDays  },
  { id: 'comunicacao',  label: 'Comunicação',  Icon: MessageSquare },
  { id: 'usuarios',     label: 'Usuários',     Icon: Users         },
  { id: 'clientes',     label: 'Clientes',     Icon: Contact       },
  { id: 'ia',           label: 'IA',           Icon: Bot           },
] as const

type TabId = typeof TABS[number]['id']

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function AnalyticsPage() {
  const [preset, setPreset] = useState<DatePreset>('30d')
  const [range, setRange] = useState<DateRange>(() => resolvePresetRange('30d'))
  const [customFrom, setCustomFrom] = useState(todayStr)
  const [customTo, setCustomTo] = useState(todayStr)
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(['comercial']))

  function handlePresetChange(p: DatePreset, r: DateRange) {
    setPreset(p)
    setRange(r)
    if (p === 'custom') {
      setCustomFrom(r.from)
      setCustomTo(r.to)
    }
  }

  function handleCustomChange(from: string, to: string) {
    setCustomFrom(from)
    setCustomTo(to)
    if (from && to && from <= to) setRange({ from, to })
  }

  function handleTabChange(id: string) {
    setVisitedTabs(prev => {
      const next = new Set(prev)
      next.add(id as TabId)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada de Comercial, Agenda, Comunicação, Usuários, Clientes e IA.
          </p>
        </div>
        <AnalyticsFilters
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={handlePresetChange}
          onCustomChange={handleCustomChange}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="comercial" onValueChange={handleTabChange} className="flex-1">
        <TabsList data-testid="analytics-tabs" className="flex-wrap h-auto gap-y-1">
          {TABS.map(({ id, label, Icon }) => (
            <TabsTrigger key={id} value={id} data-testid={`tab-trigger-${id}`}>
              <Icon className="size-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ id }) => (
          <TabsContent key={id} value={id} className="mt-4">
            {visitedTabs.has(id) ? (
              <>
                {id === 'comercial'   && <ComercialTab   range={range} />}
                {id === 'agenda'      && <AgendaTab      range={range} />}
                {id === 'comunicacao' && <ComunicacaoTab range={range} />}
                {id === 'usuarios'    && <UsuariosTab    range={range} />}
                {id === 'clientes'    && <ClientesTab    range={range} />}
                {id === 'ia'          && <IaTab          range={range} />}
              </>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Carregando…
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
