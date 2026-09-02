import type { APIRoute } from 'astro';
import { getDb } from '../../db/client.js';
import { publicSummary } from '../../db/queries.js';

export const GET: APIRoute = async ({ request, locals }) => {
  const cache = (locals.runtime.caches as CacheStorage & { default?: Cache })?.default;
  if (cache) {
    const cached = await cache.match(request);
    if (cached) return cached;
  }

  const response = Response.json(await publicSummary(getDb(locals)), {
    headers: { 'cache-control': 'public, max-age=15, s-maxage=15' }
  });
  if (cache) await cache.put(request, response.clone());
  return response;
};
