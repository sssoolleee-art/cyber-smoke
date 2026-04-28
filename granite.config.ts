import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'cyber-smoke',
  brand: {
    displayName: '사이버흡연장',
    primaryColor: '#FF6B35',
    icon: 'https://static.toss.im/appsintoss/27863/cyber-smoke-icon.png',
  },
  web: {
    host: 'localhost',
    port: 5180,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [],
});
