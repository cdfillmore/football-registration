import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Some development environments have a low inotify/file-descriptor limit.
  // Polling keeps `astro dev` usable there at the cost of a little CPU.
  vite: { server: { watch: { usePolling: true, interval: 1000 } } }
});
