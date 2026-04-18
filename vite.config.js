import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Raise the chunk-size warning threshold to avoid noise from xlsx + chart.js
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    // Pre-bundle tslib so rolldown can resolve it from @supabase packages
    include: ['tslib'],
  },
  resolve: {
    // Ensure tslib resolves to the installed package, not an external
    alias: {},
  },
  // Supabase's functions-js uses tslib which is a CJS module; tell Vite
  // to treat it as a CommonJS external during SSR scanning only.
  ssr: {
    noExternal: ['tslib'],
  },
});
