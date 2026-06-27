import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(process.cwd(), '.playwright', 'auth-state.json')

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  reporter: [['list']],

  projects: [
    // Projeto de login — run com --headed para o usuário fazer login manualmente
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.wavon.com.br',
      },
    },

    // Projeto de validação — usa a sessão salva pelo setup
    {
      name: 'chromium',
      testMatch: '**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.wavon.com.br',
        storageState: AUTH_FILE,
      },
    },
  ],
})
