import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { mkdirSync } from 'fs'

const AUTH_FILE = path.join(process.cwd(), '.playwright', 'auth-state.json')

setup('Salvar sessão do WAVON', async ({ page }) => {
  mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  console.log('\n══════════════════════════════════════════════════')
  console.log('  Faça login no WAVON na janela do navegador.')
  console.log('  O teste continuará automaticamente após o login.')
  console.log('══════════════════════════════════════════════════\n')

  await page.goto('/login')

  // Aguarda até 2 minutos para o usuário concluir o login manualmente
  await page.waitForURL('**/dashboard**', { timeout: 120_000 })

  await expect(page).toHaveURL(/dashboard/)

  await page.context().storageState({ path: AUTH_FILE })

  console.log(`\n✅ Sessão salva em: ${AUTH_FILE}`)
  console.log('   Agora execute: npm run validate:agenda\n')
})
