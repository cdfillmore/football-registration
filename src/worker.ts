import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import { finalize, reconcile } from './db/service.js';

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);
  return {
    default: {
      async fetch(request: any, env: Env, ctx: any) {
        return handle(manifest, app, request, env, ctx);
      },
      async scheduled(_controller: ScheduledController, env: Env) {
        await reconcile(env.football_registration);
        await finalize(env.football_registration);
      }
    } satisfies ExportedHandler<Env>
  };
}
