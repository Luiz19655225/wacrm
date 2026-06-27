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

    // Seções do modal
    await expect(page.getByText('Cliente')).toBeVisible()
    await expect(page.getByText('Compromisso')).toBeVisible()

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

})
