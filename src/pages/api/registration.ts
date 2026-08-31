import type { APIRoute } from 'astro';
import { getDb } from '../../db/client.js';
import { reconcile } from '../../db/service.js';
import { availabilityOpen, now } from '../../domain.js';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals); await reconcile(db); const at = now();
  const f = await db.prepare('SELECT * FROM fixtures WHERE finalized_at IS NULL ORDER BY starts_at LIMIT 1').first<any>();
  if (!f) return Response.json({ fixture: null, players: [], open: false });
  const players = await db.prepare('SELECT p.id,p.name,COALESCE(a.keen,0) keen FROM players p JOIN availability a ON a.player_id=p.id WHERE a.fixture_id=? ORDER BY p.name').bind(f.id).all();
  const testOpen = locals.runtime.env.ENABLE_TEST_FIXTURE === 'true';
  const open = testOpen || ((!import.meta.env.PROD && new Date(f.starts_at).getUTCDay() === 1) || availabilityOpen(at));
  return Response.json({ fixture: { id: f.id, startsAt: f.starts_at }, players: players.results, open }, { headers: { 'cache-control': 'no-store' } });
};
