import type { APIRoute } from 'astro';
import { getDb } from '../../../db/client.js';
import { validCookie } from '../../../lib/http.js';
export const GET: APIRoute = async ({ cookies, locals }) => {
  const secret = locals.runtime.env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? 'dev-secret';
  if (!validCookie(cookies.get('admin_session')?.value, secret)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb(locals);
  const fixtures = await db.prepare('SELECT id,starts_at,materialized_at,finalized_at FROM fixtures ORDER BY starts_at DESC').all();
  const availability = await db.prepare("SELECT a.fixture_id fixtureId,f.starts_at startsAt,p.name,a.keen FROM availability a JOIN fixtures f ON f.id=a.fixture_id JOIN players p ON p.id=a.player_id ORDER BY f.starts_at DESC,p.name").all();
  const lineups = await db.prepare("SELECT l.fixture_id fixtureId,f.starts_at startsAt,p.name,l.role,l.position FROM lineup l JOIN fixtures f ON f.id=l.fixture_id JOIN players p ON p.id=l.player_id ORDER BY f.starts_at DESC,l.role,l.position").all();
  return Response.json({ fixtures: fixtures.results, availability: availability.results, lineups: lineups.results }, { headers: { 'cache-control': 'no-store' } });
};
