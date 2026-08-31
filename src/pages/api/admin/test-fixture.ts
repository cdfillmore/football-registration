import type { APIRoute } from 'astro'; import { db } from '../../../db/client.js'; import { eligible, now, TZ } from '../../../domain.js'; import { originOk, validCookie } from '../../../lib/http.js';
function nextMondayAtSix(nowAt: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(nowAt);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  const localMidnight = Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day')));
  const weekday = new Date(localMidnight).getUTCDay();
  const days = (1 - weekday + 7) % 7 || 7;
  const candidate = new Date(localMidnight + days * 86400000 + 18 * 3600000);
  const displayedHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(candidate));
  return new Date(candidate.getTime() - (displayedHour - 18) * 3600000);
}
export const POST: APIRoute = ({ request, cookies }) => {
  if (import.meta.env.PROD) return Response.json({ error: 'Test fixtures are disabled in production.' }, { status: 403 });
  if (!validCookie(cookies.get('admin_session')?.value) || !originOk(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let start = nextMondayAtSix(now());
  while (db.prepare('SELECT id FROM fixtures WHERE starts_at=?').get(start.toISOString())) start = new Date(start.getTime() + 7 * 86400000);
  const fixture = db.transaction(() => {
    const result = db.prepare('INSERT OR IGNORE INTO fixtures(starts_at,materialized_at) VALUES (?,?)').run(start.toISOString(), now().toISOString());
    const row = db.prepare('SELECT id FROM fixtures WHERE starts_at=?').get(start.toISOString()) as { id: number };
    const add = db.prepare('INSERT OR IGNORE INTO availability(fixture_id,player_id,keen) VALUES (?,?,0)');
    const people = db.prepare('SELECT id,name FROM players').all() as { id: number; name: string }[];
    people.filter(person => eligible(person.name, start)).forEach(person => add.run(row.id, person.id));
    return { id: row.id, created: result.changes > 0 };
  })();
  return Response.json({ ok: true, ...fixture, startsAt: start.toISOString() });
};
