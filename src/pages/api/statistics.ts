import type { APIRoute } from 'astro';
import { getDb } from '../../db/client.js';
import { statistics } from '../../db/queries.js';
export const GET: APIRoute = async ({ locals }) => Response.json(await statistics(getDb(locals)), { headers: { 'cache-control': 'no-store' } });
