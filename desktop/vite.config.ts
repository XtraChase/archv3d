import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The renderer, loaded from disk by electron/main.cjs: relative asset paths.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true }
});
