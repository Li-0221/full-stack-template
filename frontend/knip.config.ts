import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'playwright.config.ts',
    'src/components/date-time-picker.tsx',
    'src/components/select-dropdown.tsx',
    'src/hooks/use-debounced-search.ts',
  ],
  ignore: [
    'src/client/**',
    'src/components/ui/**',
    'src/components/layout/app-title.tsx',
    'src/tanstack-table.d.ts',
    'public/env-config.js',
  ],
  tags: ['-public'],
}

export default config
