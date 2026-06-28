"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AgendaDashboard } from "./agenda-dashboard"
import { ComunicacaoPanel } from "./comunicacao-panel"
import { IntegrationsPanel } from "./integrations-panel"
import { CalendarDays, MessageSquare, PlugZap } from "lucide-react"

export function ObservabilidadePage() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Observabilidade</h1>
        <p className="text-sm text-muted-foreground">
          Monitoramento em tempo real da Agenda, Comunicação e Integrações.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agenda" className="flex-1">
        <TabsList data-testid="obs-tabs">
          <TabsTrigger value="agenda">
            <CalendarDays className="size-3.5" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="comunicacao">
            <MessageSquare className="size-3.5" />
            Comunicação
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <PlugZap className="size-3.5" />
            Integrações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          <AgendaDashboard />
        </TabsContent>

        <TabsContent value="comunicacao" className="mt-4">
          <ComunicacaoPanel />
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <IntegrationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
