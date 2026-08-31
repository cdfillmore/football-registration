import type { APIRoute } from 'astro';
import { getDb } from '../../db/client.js';
import { history } from '../../db/queries.js';
export const GET: APIRoute = async ({ locals }) => Response.json({ fixtures: await history(getDb(locals)) }, { headers: { 'cache-control': 'no-store' } });
