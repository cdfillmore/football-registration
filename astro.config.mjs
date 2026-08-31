import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({
  output: 'server',
  session: { driver: 'memory' },
  adapter: cloudflare({
    platformProxy: { enabled: true },
    workerEntryPoint: { path: 'src/worker.ts' }
  }),
  // Some development environments have a low inotify/file-descriptor limit.
  // Polling keeps `astro dev` usable there at the cost of a little CPU.
  vite: { server: { watch: { usePolling: true, interval: 1000 } } }
});
