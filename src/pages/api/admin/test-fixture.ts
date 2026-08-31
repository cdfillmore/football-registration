import type { APIRoute } from 'astro';
import { getDb } from '../../../db/client.js';
import { eligible, now, TZ } from '../../../domain.js';
import { originOk, validCookie } from '../../../lib/http.js';
function nextMondayAtSix(at: Date) { const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at); const get = (x: string) => p.find(y => y.type === x)?.value ?? ''; const midnight = Date.UTC(+get('year'), +get('month') - 1, +get('day')); const days = (1 - new Date(midnight).getUTCDay() + 7) % 7 || 7; return new Date(midnight + days * 86400000 + 17 * 3600000); }
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  if (import.meta.env.PROD && locals.runtime.env.ENABLE_TEST_FIXTURE !== 'true') return Response.json({ error: 'Test fixtures are disabled in production.' }, { status: 403 }); const secret = locals.runtime.env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? 'dev-secret';
  if (!validCookie(cookies.get('admin_session')?.value, secret) || !originOk(request, locals.runtime.env.ORIGIN)) return Response.json({ error: 'Unauthorized' }, { status: 401 }); const db = getDb(locals); let start = nextMondayAtSix(now());
  while (await db.prepare('SELECT id FROM fixtures WHERE starts_at=?').bind(start.toISOString()).first()) start = new Date(start.getTime() + 7 * 86400000);
  await db.prepare('INSERT INTO fixtures(starts_at,materialized_at) VALUES (?,?)').bind(start.toISOString(), now().toISOString()).run(); const f = await db.prepare('SELECT id FROM fixtures WHERE starts_at=?').bind(start.toISOString()).first<{ id: number }>(); const people = await db.prepare('SELECT id,name FROM players').all<{ id: number; name: string }>();
  if (f) { const statements = people.results.filter(p => eligible(p.name, start)).map(p => db.prepare('INSERT OR IGNORE INTO availability(fixture_id,player_id,keen) VALUES (?,?,0)').bind(f.id, p.id)); if (statements.length) await db.batch(statements); } return Response.json({ ok: true, created: true, startsAt: start.toISOString() });
};
