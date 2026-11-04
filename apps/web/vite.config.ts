import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiProxy = { '/api': 'http://localhost:3000' };

export default defineConfig({
  plugins: [react()],
  build: {
    // Safari 14.1 / iOS 14.5 — минимальная поддержка (D-013).
    target: ['es2020', 'safari14'],
  },
  server: { port: 5173, strictPort: true, proxy: apiProxy },
  preview: { port: 4173, strictPort: true, proxy: apiProxy },
});
