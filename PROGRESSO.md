# WAVON CRM — Progresso

Checklist rápido de status por fase. Detalhes completos (decisões, bugs encontrados, achados técnicos) ficam no `CLAUDE.md` — este arquivo é só o resumo de "o que está pronto".

## Fase 1 — Planos, trial, billing (fundação) e conexões multicanal
✅ Concluída e em produção (commit `57a030d`)

## Fase 2 — Billing real (Asaas)
✅ Concluída e validada em produção (commit `754ce90`)
- Subscription ativa: `sub_6gffstr5l42r53od` (plano Pro)
- Pendência não-bloqueante: webhook Asaas não assina `SUBSCRIPTION_CANCELED`

## Fase 3 — WhatsApp via Evolution API
🟡 ~95% concluída — validada em produção (commits `c2b2b34` + `e7e0571`, deploy `dpl_9s6KSGibzCsrivq6rCvWRaJmib5J`)

Infraestrutura:
- [x] Supabase — migration 030 aplicada e validada
- [x] Railway — Evolution API + Redis online
- [x] Vercel — env vars configuradas (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_TOKEN`)
- [x] Deploy de produção — `www.wavon.com.br`

Funcionalidade (inbound — recebimento):
- [x] QR Code / pareamento
- [x] Webhook recebendo eventos da Evolution
- [x] `contacts` sendo criados
- [x] `conversations` sendo criadas (com `connection_id` correto)
- [x] `messages` sendo gravadas
- [x] Inbox exibindo histórico e abrindo conversas normalmente
- [x] Banner falso "WhatsApp is not connected" corrigido

Funcionalidade (outbound — envio) e mídias:
- [ ] Testar envio de mensagens do WAVON → WhatsApp (não testado ainda nesta sessão)
- [ ] Mídias inbound: imagem
- [ ] Mídias inbound: áudio
- [ ] Mídias inbound: vídeo
- [ ] Mídias inbound: documento
- [ ] Resolver `[Unsupported message type]`
- [ ] Resolver "Image unavailable" no Inbox

Limpeza técnica:
- [ ] Remover logs temporários de diagnóstico em `evolution-webhook-processor.ts` (marcados `// TEMP DIAGNOSTIC LOG`) após confirmar estabilidade

## Próximo a planejar (depois da Fase 3 fechada)
- Revisão de UX do Inbox
- Próxima fase de automações e IA
- Enforcement real de billing por `access_status` (bloquear CRM/automações) — fase própria, não iniciar sem aprovação explícita
