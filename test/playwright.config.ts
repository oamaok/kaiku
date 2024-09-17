import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
