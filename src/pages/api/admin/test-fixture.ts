import type { APIRoute } from 'astro';
import { getDb } from '../../../db/client.js';
import { correctFutureMondayFixtures } from '../../../db/service.js';
import { eligible, nextMondayAtSix, now } from '../../../domain.js';
import { originOk, validCookie } from '../../../lib/http.js';
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  if (import.meta.env.PROD && locals.runtime.env.ENABLE_TEST_FIXTURE !== 'true') return Response.json({ error: 'Test fixtures are disabled in production.' }, { status: 403 }); const secret = locals.runtime.env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? 'dev-secret';
  if (!validCookie(cookies.get('admin_session')?.value, secret) || !originOk(request, locals.runtime.env.ORIGIN)) return Response.json({ error: 'Unauthorized' }, { status: 401 }); const db = getDb(locals); await correctFutureMondayFixtures(db); let start = nextMondayAtSix(now());
  while (await db.prepare('SELECT id FROM fixtures WHERE starts_at=?').bind(start.toISOString()).first()) start = nextMondayAtSix(start);
  await db.prepare('INSERT INTO fixtures(starts_at,materialized_at) VALUES (?,?)').bind(start.toISOString(), now().toISOString()).run(); const f = await db.prepare('SELECT id FROM fixtures WHERE starts_at=?').bind(start.toISOString()).first<{ id: number }>(); const people = await db.prepare('SELECT id,name FROM players').all<{ id: number; name: string }>();
  if (f) { const statements = people.results.filter(p => eligible(p.name, start)).map(p => db.prepare('INSERT OR IGNORE INTO availability(fixture_id,player_id,keen) VALUES (?,?,0)').bind(f.id, p.id)); if (statements.length) await db.batch(statements); } return Response.json({ ok: true, created: true, startsAt: start.toISOString() });
};
