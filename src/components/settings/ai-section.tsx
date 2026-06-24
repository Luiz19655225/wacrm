'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SettingsPanelHead } from './settings-panel-head';
import { AiSettingsPanel } from './ai-settings-panel';
import { AiCompanyProfilePanel } from './ai-company-profile-panel';
import { AiProductsPanel } from './ai-products-panel';
import { AiFaqsPanel } from './ai-faqs-panel';
import { AiGoalsPanel } from './ai-goals-panel';
import { AiRulesPanel } from './ai-rules-panel';

const TAB_TRIGGER_CLASS =
  'data-active:bg-muted data-active:text-primary text-muted-foreground';

/**
 * "Configurações → IA" — Fase 6 turned this from a single OpenAI
 * credentials card into a full per-account knowledge base. Every AI
 * call (Inbox suggest/summarize/classify + the site widget) builds
 * its prompt as Perfil + Produtos + FAQ + Objetivos + Regras +
 * Histórico, in that order — these six tabs are exactly those pieces
 * plus the OpenAI connection itself.
 */
export function AiSection() {
  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="IA"
        description="Conecte a OpenAI e treine a IA com informações da sua empresa. Tudo aqui é usado automaticamente nas respostas do Inbox e no atendente do site."
      />

      <Tabs defaultValue="openai">
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="openai" className={TAB_TRIGGER_CLASS}>
              OpenAI
            </TabsTrigger>
            <TabsTrigger value="perfil" className={TAB_TRIGGER_CLASS}>
              Perfil da Empresa
            </TabsTrigger>
            <TabsTrigger value="produtos" className={TAB_TRIGGER_CLASS}>
              Produtos
            </TabsTrigger>
            <TabsTrigger value="faq" className={TAB_TRIGGER_CLASS}>
              FAQ
            </TabsTrigger>
            <TabsTrigger value="objetivos" className={TAB_TRIGGER_CLASS}>
              Objetivos
            </TabsTrigger>
            <TabsTrigger value="regras" className={TAB_TRIGGER_CLASS}>
              Regras
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="openai" className="mt-4">
          <AiSettingsPanel />
        </TabsContent>
        <TabsContent value="perfil" className="mt-4">
          <AiCompanyProfilePanel />
        </TabsContent>
        <TabsContent value="produtos" className="mt-4">
          <AiProductsPanel />
        </TabsContent>
        <TabsContent value="faq" className="mt-4">
          <AiFaqsPanel />
        </TabsContent>
        <TabsContent value="objetivos" className="mt-4">
          <AiGoalsPanel />
        </TabsContent>
        <TabsContent value="regras" className="mt-4">
          <AiRulesPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}
