import type { APIRoute } from 'astro'; import { db } from '../../../db/client.js'; import { reconcile } from '../../../db/service.js'; import { draw, now } from '../../../domain.js'; import { originOk, validCookie } from '../../../lib/http.js';
export const POST: APIRoute = ({ request, cookies }) => {
  if (!validCookie(cookies.get('admin_session')?.value) || !originOk(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  reconcile();
  const fixture = db.prepare("SELECT * FROM fixtures WHERE finalized_at IS NULL ORDER BY starts_at LIMIT 1").get() as { id: number; starts_at: string } | undefined;
  if (!fixture) return Response.json({ error: 'There is no unfinalized fixture.' }, { status: 404 });
  const keen = (db.prepare('SELECT player_id FROM availability WHERE fixture_id=? AND keen=1').all(fixture.id) as { player_id: number }[]).map(row => row.player_id);
  const result = draw(keen);
  const tx = db.transaction(() => {
    const current = db.prepare('SELECT finalized_at FROM fixtures WHERE id=?').get(fixture.id) as { finalized_at?: string } | undefined;
    if (current?.finalized_at) return false;
    const add = db.prepare('INSERT INTO lineup(fixture_id,player_id,role,position) VALUES (?,?,?,?)');
    result.selected.forEach((id, position) => add.run(fixture.id, id, 'selected', position));
    result.reserves.forEach((id, position) => add.run(fixture.id, id, 'reserve', position));
    db.prepare('UPDATE fixtures SET finalized_at=? WHERE id=?').run(now().toISOString(), fixture.id);
    return true;
  });
  if (!tx()) return Response.json({ error: 'Fixture was already finalized.' }, { status: 409 });
  return Response.json({ ok: true, selected: result.selected.length, reserves: result.reserves.length });
};
