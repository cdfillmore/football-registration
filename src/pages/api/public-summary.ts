import type { APIRoute } from 'astro';
import { getDb } from '../../db/client.js';
import { publicSummary } from '../../db/queries.js';

export const GET: APIRoute = async ({ locals }) => Response.json(await publicSummary(getDb(locals)), {
  headers: { 'cache-control': 'no-store' }
});
