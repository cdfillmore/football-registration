import type { APIRoute } from 'astro'; import { db } from '../../../db/client.js'; import { validCookie } from '../../../lib/http.js';
export const GET: APIRoute = ({ cookies }) => {
  if (!validCookie(cookies.get('admin_session')?.value)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const fixtures = db.prepare('SELECT id,starts_at,materialized_at,finalized_at FROM fixtures ORDER BY starts_at DESC').all();
  const availability = db.prepare("SELECT a.fixture_id fixtureId,f.starts_at startsAt,p.name,a.keen FROM availability a JOIN fixtures f ON f.id=a.fixture_id JOIN players p ON p.id=a.player_id ORDER BY f.starts_at DESC,p.name").all();
  const lineups = db.prepare("SELECT l.fixture_id fixtureId,f.starts_at startsAt,p.name,l.role,l.position FROM lineup l JOIN fixtures f ON f.id=l.fixture_id JOIN players p ON p.id=l.player_id ORDER BY f.starts_at DESC,l.role,l.position").all();
  return Response.json({ fixtures, availability, lineups });
};
