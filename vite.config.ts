import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '127.0.0.1',
      },
      plugins: [react()],
      build: {
        sourcemap: false,
        rollupOptions: {
          output: {
            // Librerías en archivos aparte: cambian poco y el navegador las reutiliza entre versiones.
            manualChunks: {
              react: ['react', 'react-dom', 'react-dom/client'],
              supabase: ['@supabase/supabase-js'],
              icons: ['lucide-react'],
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
