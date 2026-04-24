import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASEPATH || '/',
  resolve: {
    alias: {
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@public': path.resolve(__dirname, 'src/public'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@contexts': path.resolve(__dirname, 'src/common/contexts'),
      '@supportmanagement': path.resolve(__dirname, 'src/supportmanagement'),
      '@casedata': path.resolve(__dirname, 'src/casedata'),
      '@common': path.resolve(__dirname, 'src/common'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@stores': path.resolve(__dirname, 'src/stores'),
      src: path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `$basePath: '${process.env.VITE_BASEPATH || ''}';`,
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    proxy: {
      '/napi': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/napi/, '/api'),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  envPrefix: 'VITE_',
});
