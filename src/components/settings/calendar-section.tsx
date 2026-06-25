'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SettingsPanelHead } from './settings-panel-head';
import { CalendarSettingsPanel } from './calendar-settings-panel';
import { BusinessHoursPanel } from './business-hours-panel';

const TAB_TRIGGER_CLASS =
  'data-active:bg-muted data-active:text-primary text-muted-foreground';

/**
 * "Configurações → Agenda" — Fase 7.2.
 *
 * Provides two sub-tabs:
 *   Conexão      — OAuth with Microsoft Outlook, timezone, meeting duration
 *   Horário      — Business hours per weekday
 *
 * The CalendarProvider abstraction lives in src/lib/calendar/ — this UI
 * only interacts with the HTTP API layer, never with providers directly.
 */
export function CalendarSection() {
  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Agenda"
        description="Configure o horário de atendimento e conecte uma agenda para que a IA ofereça agendamentos automáticos quando sua empresa estiver fora do expediente."
      />

      <Tabs defaultValue="conexao">
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="conexao" className={TAB_TRIGGER_CLASS}>
              Conexão
            </TabsTrigger>
            <TabsTrigger value="horario" className={TAB_TRIGGER_CLASS}>
              Horário comercial
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="conexao" className="mt-4">
          <CalendarSettingsPanel />
        </TabsContent>
        <TabsContent value="horario" className="mt-4">
          <BusinessHoursPanel />
        </TabsContent>
      </Tabs>
    </section>
  )
}
