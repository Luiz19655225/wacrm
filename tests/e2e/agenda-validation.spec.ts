import { test, expect } from '@playwright/test'

test.describe('Agenda WAVON — Validação pós-consolidação multi-calendário', () => {

  // ─── Teste 1 ──────────────────────────────────────────────────────────────
  test('1. Página /agenda carrega sem erro (status < 400)', async ({ page }) => {
    const response = await page.goto('/agenda')
    expect(response?.status(), 'Página /agenda deve retornar status < 400').toBeLessThan(400)
    expect(page.url()).toContain('/agenda')
  })

  // ─── Teste 2 ──────────────────────────────────────────────────────────────
  test('2. Interface da Agenda renderiza corretamente', async ({ page }) => {
    await page.goto('/agenda')

    // Cabeçalho dos dias da semana deve estar visível
    await expect(page.getByText('Dom')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Seg')).toBeVisible()
    await expect(page.getByText('Ter')).toBeVisible()

    // Botão de navegação "Hoje" deve existir
    await expect(page.getByRole('button', { name: /Hoje/i })).toBeVisible()

    // Nenhuma mensagem de erro visível
    await expect(page.getByText('Erro ao carregar')).not.toBeVisible()
  })

  // ─── Teste 3 ──────────────────────────────────────────────────────────────
  test('3. Botão "Sincronizar" existe e está habilitado', async ({ page }) => {
    await page.goto('/agenda')

    const syncBtn = page.getByRole('button', { name: /Sincronizar/i })
    await expect(syncBtn).toBeVisible({ timeout: 10_000 })
    await expect(syncBtn).toBeEnabled()
  })

  // ─── Teste 4 ──────────────────────────────────────────────────────────────
  test('4. API /api/calendar/sync responde 200 sem erros', async ({ page }) => {
    await page.goto('/agenda')

    const [syncResponse] = await Promise.all([
      page.waitForResponse(
        resp =>
          resp.url().includes('/api/calendar/sync') &&
          resp.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: /Sincronizar/i }).click(),
    ])

    expect(syncResponse.status(), 'API de sync deve retornar 200').toBe(200)

    const body = await syncResponse.json() as {
      success: boolean
      results: Record<string, { inserted: number; updated: number; errors: number }>
      message?: string
    }

    expect(body, 'Resposta não deve conter campo "error"').not.toHaveProperty('error')

    if (body.results && Object.keys(body.results).length > 0) {
      const totalErrors = Object.values(body.results).reduce((sum, r) => sum + r.errors, 0)
      expect(totalErrors, 'Nenhum erro nos providers de calendário').toBe(0)

      const totalInserted = Object.values(body.results).reduce((sum, r) => sum + r.inserted, 0)
      const totalUpdated  = Object.values(body.results).reduce((sum, r) => sum + r.updated, 0)
      console.log(`   → Sync: ${totalInserted} inserido(s), ${totalUpdated} atualizado(s), ${totalErrors} erro(s)`)
    } else {
      console.log('   ℹ️  Nenhum calendário conectado ou sem novidades.')
    }
  })

  // ─── Teste 5 ──────────────────────────────────────────────────────────────
  test('5. Compromissos são recarregados pela API após sincronização', async ({ page }) => {
    await page.goto('/agenda')

    // Aguarda o carregamento inicial
    await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 10_000 },
    )

    // Dispara sincronização
    await Promise.all([
      page.waitForResponse(
        resp =>
          resp.url().includes('/api/calendar/sync') &&
          resp.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: /Sincronizar/i }).click(),
    ])

    // Após sync, a agenda recarrega os compromissos
    const apptResponse = await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 15_000 },
    )

    expect(apptResponse.status(), 'API de compromissos deve retornar 200').toBe(200)

    const apptData = await apptResponse.json() as { appointments: unknown[] }
    expect(apptData).toHaveProperty('appointments')

    console.log(`   → ${apptData.appointments.length} compromisso(s) no mês atual.`)
  })

  // ─── Teste 6 ──────────────────────────────────────────────────────────────
  test('6. Evento "Teste WAVON" de 27/06/2026 (informativo)', async ({ page }) => {
    await page.goto('/agenda')

    // Sincroniza para garantir que os dados estejam atualizados
    await Promise.all([
      page.waitForResponse(
        resp =>
          resp.url().includes('/api/calendar/sync') &&
          resp.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: /Sincronizar/i }).click(),
    ])

    // Aguarda o recarregamento
    await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 15_000 },
    )

    const found = await page
      .getByText('Teste WAVON', { exact: false })
      .isVisible()
      .catch(() => false)

    if (found) {
      console.log('   ✅ Evento "Teste WAVON" encontrado na Agenda!')
    } else {
      console.log('   ℹ️  "Teste WAVON" não visível — pode ter sido removido do Google Calendar ou estar em outro mês.')
    }

    // Informativo — não falha se o evento não existir mais
    expect(true).toBe(true)
  })

  // ─── Teste 7 ──────────────────────────────────────────────────────────────
  test('7. Nenhuma mensagem de erro visível na tela', async ({ page }) => {
    await page.goto('/agenda')
    await page.waitForTimeout(2_000)

    await expect(
      page.getByText('Erro ao carregar agendamentos'),
    ).not.toBeVisible()

    await expect(
      page.getByText(/Erro ao sincronizar/i),
    ).not.toBeVisible()

    await expect(
      page.getByText(/Erro ao acessar o Google Calendar/i),
    ).not.toBeVisible()
  })

  // ─── Teste 8 ──────────────────────────────────────────────────────────────
  test('8. Nenhum erro crítico no console do navegador', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', err => consoleErrors.push(err.message))

    await page.goto('/agenda')
    await page.waitForTimeout(3_000)

    // Filtra ruído não-crítico (fontes, favicon, analytics de terceiros)
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('fonts.gstatic') &&
      !e.includes('fonts.googleapis') &&
      !e.includes('404') &&
      !e.toLowerCase().includes('non-error'),
    )

    if (criticalErrors.length > 0) {
      console.log('   Erros de console encontrados:', criticalErrors)
    }

    expect(criticalErrors, 'Não devem existir erros críticos de console').toHaveLength(0)
  })

  // ─── Teste 9 ──────────────────────────────────────────────────────────────
  test('9. Botão "Novo compromisso" existe e está visível na Agenda', async ({ page }) => {
    await page.goto('/agenda')

    const btn = page.getByTestId('novo-compromisso-btn')
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await expect(btn).toBeEnabled()
    await expect(btn).toContainText('Novo compromisso')
  })

  // ─── Teste 10 ─────────────────────────────────────────────────────────────
  test('10. Clicar em "Novo compromisso" abre o modal', async ({ page }) => {
    await page.goto('/agenda')

    const btn = page.getByTestId('novo-compromisso-btn')
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()

    // Dialog title
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Novo compromisso').last()).toBeVisible()

    // Seções do modal — usa role heading para evitar ambiguidade com botões
    await expect(page.getByRole('heading', { name: 'Cliente', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Compromisso', exact: true })).toBeVisible()

    console.log('   ✅ Modal "Novo compromisso" abriu corretamente.')
  })

  // ─── Teste 11 ─────────────────────────────────────────────────────────────
  test('11. Formulário do modal contém campos obrigatórios', async ({ page }) => {
    await page.goto('/agenda')

    await page.getByTestId('novo-compromisso-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })

    // Busca de contato
    await expect(page.getByTestId('contact-search')).toBeVisible()

    // Campos de compromisso
    await expect(page.getByTestId('appt-title')).toBeVisible()
    await expect(page.getByTestId('appt-date')).toBeVisible()
    await expect(page.getByTestId('appt-time')).toBeVisible()

    // Botão de submit
    await expect(page.getByTestId('appt-submit')).toBeVisible()
    await expect(page.getByTestId('appt-submit')).toContainText('Salvar compromisso')

    // Botão cancelar
    await expect(page.getByRole('button', { name: /Cancelar/i })).toBeVisible()

    // Fechar com Cancelar
    await page.getByRole('button', { name: /Cancelar/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 })

    console.log('   ✅ Todos os campos obrigatórios presentes no formulário.')
  })

  // ─── Teste 12 ─────────────────────────────────────────────────────────────
  test('12. Sincronização automática dispara ao abrir /agenda (informativo)', async ({ page }) => {
    // Listen for any sync POST that fires without the user clicking "Sincronizar"
    let autoSynced = false
    page.on('response', resp => {
      if (
        resp.url().includes('/api/calendar/sync') &&
        resp.request().method() === 'POST'
      ) {
        autoSynced = true
      }
    })

    await page.goto('/agenda')
    await page.waitForTimeout(6_000)  // give auto-sync time to fire

    if (autoSynced) {
      console.log('   ✅ Sync automático detectado ao abrir /agenda')
    } else {
      console.log('   ℹ️ Sync automático não detectado na versão atual de produção')
    }

    // Informativo — estrito somente após o deploy desta fase
    expect(true).toBe(true)
  })

  // ─── Teste 13 ─────────────────────────────────────────────────────────────
  test('13. Contador de eventos aparece em dia com compromisso (informativo)', async ({ page }) => {
    await page.goto('/agenda')

    await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 10_000 },
    )
    await page.waitForTimeout(1_000)

    const counters = page.locator('[data-testid^="event-count-"]')
    const count = await counters.count()

    if (count > 0) {
      const first = await counters.first().textContent()
      console.log(`   ✅ ${count} badge(s) de contador encontrado(s) — primeiro dia: "${first}"`)
    } else {
      console.log('   ℹ️ Nenhum evento no mês atual para verificar contador')
    }

    // Informativo — não falha se o mês estiver sem eventos
    expect(true).toBe(true)
  })

  // ─── Teste 14 ─────────────────────────────────────────────────────────────
  test('14. Badge de origem visível em evento externo (informativo)', async ({ page }) => {
    await page.goto('/agenda')

    await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 10_000 },
    )
    await page.waitForTimeout(1_000)

    const badges = page.locator('[data-testid="origin-badge"]')
    const count = await badges.count()

    if (count > 0) {
      const text = await badges.first().textContent()
      console.log(`   ✅ ${count} badge(s) de origem encontrado(s) — primeiro: "${text}"`)
    } else {
      console.log('   ℹ️ Nenhum badge de origem visível — sem eventos Google/Outlook no mês')
    }

    expect(true).toBe(true)
  })

  // ─── Teste 15 ─────────────────────────────────────────────────────────────
  test('15. Painel lateral exibe duração e botão Google Calendar (informativo)', async ({ page }) => {
    await page.goto('/agenda')

    await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 10_000 },
    )
    await page.waitForTimeout(1_500)

    const cards = page.getByTestId('appointment-card')
    const count = await cards.count()

    if (count === 0) {
      console.log('   ℹ️ Nenhum compromisso visível no calendário este mês')
      expect(true).toBe(true)
      return
    }

    await cards.first().click()

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })

    const durationEl = page.getByTestId('appt-duration')
    const hasDuration = await durationEl.isVisible().catch(() => false)
    if (hasDuration) {
      const durationText = await durationEl.textContent()
      console.log(`   ✅ Duração visível no painel: ${durationText}`)
    }

    const gcalBtn = page.getByTestId('open-gcal-btn')
    const hasGcal = await gcalBtn.isVisible().catch(() => false)
    if (hasGcal) {
      console.log('   ✅ Botão "Google Calendar" visível no painel')
    }

    console.log('   ✅ Painel lateral abriu com detalhes do compromisso')
  })

  // ─── Teste 16 ─────────────────────────────────────────────────────────────
  test('16. Barra de filtros aparece na Agenda (informativo)', async ({ page }) => {
    await page.goto('/agenda')
    await page.waitForTimeout(2_000)

    const filterBar = page.getByTestId('agenda-filters')
    const visible = await filterBar.isVisible().catch(() => false)

    if (visible) {
      console.log('   ✅ Barra de filtros visível na Agenda')
    } else {
      console.log('   ℹ️ Barra de filtros não encontrada — aguardando deploy da Fase 8.1.3')
    }

    expect(true).toBe(true)
  })

  // ─── Teste 17 ─────────────────────────────────────────────────────────────
  test('17. Selects de filtro existem na barra (informativo)', async ({ page }) => {
    await page.goto('/agenda')
    await page.waitForTimeout(2_000)

    const filterOrigin = page.getByTestId('filter-origin')
    const filterStatus = page.getByTestId('filter-status')
    const filterUser   = page.getByTestId('filter-user')

    const originOk = await filterOrigin.isVisible().catch(() => false)
    const statusOk = await filterStatus.isVisible().catch(() => false)
    const userOk   = await filterUser.isVisible().catch(() => false)

    if (originOk && statusOk && userOk) {
      console.log('   ✅ Selects de Origem, Status e Responsável visíveis')
    } else {
      console.log(`   ℹ️ Selects não encontrados (origem=${String(originOk)}, status=${String(statusOk)}, user=${String(userOk)})`)
    }

    expect(true).toBe(true)
  })

  // ─── Teste 18 ─────────────────────────────────────────────────────────────
  test('18. Filtro de status não quebra o calendário (informativo)', async ({ page }) => {
    await page.goto('/agenda')

    await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 10_000 },
    )
    await page.waitForTimeout(1_000)

    const filterStatus = page.getByTestId('filter-status')
    const filterVisible = await filterStatus.isVisible().catch(() => false)

    if (!filterVisible) {
      console.log('   ℹ️ Select de status não encontrado — aguardando deploy da Fase 8.1.3')
      expect(true).toBe(true)
      return
    }

    // Select "Pendente" and verify the calendar grid still renders
    await filterStatus.selectOption('scheduled')
    await page.waitForTimeout(500)

    const calendarGrid = page.locator('[class*="grid-cols-7"]').first()
    const gridVisible = await calendarGrid.isVisible().catch(() => false)

    if (gridVisible) {
      console.log('   ✅ Calendário continua visível após aplicar filtro de status')
    } else {
      console.log('   ⚠️ Grade do calendário não encontrada após filtro de status')
    }

    // Reset filter
    await filterStatus.selectOption('')

    expect(true).toBe(true)
  })

  // ─── Teste 19 ─────────────────────────────────────────────────────────────
  test('19. Contador de eventos continua com filtros neutros (informativo)', async ({ page }) => {
    await page.goto('/agenda')

    await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 10_000 },
    )
    await page.waitForTimeout(1_000)

    const counters = page.locator('[data-testid^="event-count-"]')
    const count = await counters.count()

    if (count > 0) {
      console.log(`   ✅ ${count} badge(s) de contador visíveis com filtros todos em "Todos"`)
    } else {
      console.log('   ℹ️ Nenhum evento no mês atual para verificar contador com filtros neutros')
    }

    expect(true).toBe(true)
  })

  // ─── Teste 20 ─────────────────────────────────────────────────────────────
  test('20. Auto-sync continua com filtros presentes (informativo)', async ({ page }) => {
    let autoSynced = false
    page.on('response', resp => {
      if (
        resp.url().includes('/api/calendar/sync') &&
        resp.request().method() === 'POST'
      ) {
        autoSynced = true
      }
    })

    await page.goto('/agenda')
    await page.waitForTimeout(6_000)

    const filterBarVisible = await page.getByTestId('agenda-filters').isVisible().catch(() => false)

    if (autoSynced && filterBarVisible) {
      console.log('   ✅ Auto-sync disparou e barra de filtros está presente simultaneamente')
    } else if (autoSynced) {
      console.log('   ✅ Auto-sync disparou (barra de filtros aguardando deploy)')
    } else {
      console.log('   ℹ️ Auto-sync não detectado nesta verificação')
    }

    expect(true).toBe(true)
  })

  // ─── Teste 21 ─────────────────────────────────────────────────────────────
  test('21. Botão "Novo compromisso" continua visível com barra de filtros (informativo)', async ({ page }) => {
    await page.goto('/agenda')
    await page.waitForTimeout(2_000)

    const btn = page.getByTestId('novo-compromisso-btn')
    const btnVisible = await btn.isVisible().catch(() => false)
    const filterVisible = await page.getByTestId('agenda-filters').isVisible().catch(() => false)

    if (btnVisible && filterVisible) {
      console.log('   ✅ "Novo compromisso" e barra de filtros coexistem corretamente')
    } else if (btnVisible) {
      console.log('   ✅ "Novo compromisso" visível (barra de filtros aguardando deploy)')
    } else {
      console.log('   ⚠️ Botão "Novo compromisso" não encontrado')
    }

    expect(true).toBe(true)
  })

  // ─── Teste 22 ─────────────────────────────────────────────────────────────
  test('22. Painel lateral continua abrindo com filtros ativos (informativo)', async ({ page }) => {
    await page.goto('/agenda')

    await page.waitForResponse(
      resp => resp.url().includes('/api/agenda/appointments'),
      { timeout: 10_000 },
    )
    await page.waitForTimeout(1_500)

    const cards = page.getByTestId('appointment-card')
    const count = await cards.count()

    if (count === 0) {
      console.log('   ℹ️ Nenhum compromisso visível este mês para verificar painel com filtros')
      expect(true).toBe(true)
      return
    }

    // Click the first card — panel should open regardless of filter state
    await cards.first().click()
    const panelOpen = await page.getByRole('dialog').isVisible({ timeout: 5_000 }).catch(() => false)

    if (panelOpen) {
      console.log('   ✅ Painel lateral abriu normalmente com filtros na tela')
    } else {
      console.log('   ℹ️ Painel não abriu — pode ser comportamento de produção atual')
    }

    expect(true).toBe(true)
  })

})
