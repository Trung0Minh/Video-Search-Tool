// File: frontend/vite.config.ts

import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 5173, // Or 5173, just make sure it's consistent
    fs: {
      strict: true,
    },
  },
  build: {
    target: 'esnext',
  },
});