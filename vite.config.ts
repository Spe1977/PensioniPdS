import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular() as any],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    server: {
      deps: {
        inline: ['@ionic/core', '@ionic/angular', '@ionic/angular-toolkit'],
      },
    },
  },
});
