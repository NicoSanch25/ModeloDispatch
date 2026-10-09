import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const mock = fileURLToPath(new URL('./supabase.ts', import.meta.url));
const server = await createServer({
  configFile: false,
  plugins: [
    { name: 'isolated-supabase-fixtures', enforce: 'pre', resolveId(source) {
      if (source.endsWith('/lib/supabase')) return mock;
    } },
    react()
  ],
  server: { host: '127.0.0.1', port: 3100, strictPort: true },
  clearScreen: false
});
await server.listen();
console.log('Isolated UI: http://127.0.0.1:3100/tests/ui/harness.html');
