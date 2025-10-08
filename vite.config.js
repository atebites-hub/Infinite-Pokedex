import { defineConfig } from 'vite';

export default defineConfig({
  root: 'source/client',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'source/client/index.html',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  preview: {
    port: 4173,
    open: true,
  },
});
