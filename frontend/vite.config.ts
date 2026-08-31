/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'

const DEFAULT_DEV_PORT = 5176

function normalizeBasePath(value: string | undefined) {
  const path = value?.trim().replace(/^\/+|\/+$/g, '')
  return path ? `/${path}/` : '/'
}

function resolveDevPort(value: string | undefined) {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65_535
    ? port
    : DEFAULT_DEV_PORT
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const appBasePath = normalizeBasePath(env.VITE_APP_BASE_PATH)
  const appBuildId = new Date().toISOString()

  return {
    base: command === 'serve' ? appBasePath : './',
    plugins: [
      {
        name: 'full-stack-runtime-base-path',
        transformIndexHtml(html) {
          return {
            html: html.replace(
              '<base href="/" />',
              `<base href="${appBasePath}" />`
            ),
            tags: [
              {
                tag: 'meta',
                attrs: { name: 'app-build-id', content: appBuildId },
                injectTo: 'head',
              },
            ],
          }
        },
      },
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: resolveDevPort(env.VITE_DEV_PORT),
    },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      silent: 'passed-only',
      unstubEnvs: true,
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
      coverage: {
        // include: ['src/**/*.{js,jsx,ts,tsx}'], // Uncomment to expand the report to all src/**/* so untested modules appear as 0% coverage.
        exclude: [
          'src/components/ui/**',
          'src/assets/**',
          'src/tanstack-table.d.ts',
          'src/routeTree.gen.ts',
          'src/test-utils/**',
          'src/routes/**',
        ],
      },
    },
  }
})
