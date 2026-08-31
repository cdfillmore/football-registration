import type { APIRoute } from 'astro';
import { getDb } from '../../../db/client.js';
import { eligible, validLineup } from '../../../domain.js';
import { originOk, validCookie } from '../../../lib/http.js';
async function auth(cookies: any, locals: App.Locals) { return validCookie(cookies.get('admin_session')?.value, locals.runtime.env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? 'dev-secret'); }
export const GET: APIRoute = async ({ cookies, request, locals }) => {
  if (!await auth(cookies, locals)) return Response.json({ error: 'Unauthorized' }, { status: 401 }); const db = getDb(locals); const id = Number(new URL(request.url).searchParams.get('fixtureId'));
  const f = await (id ? db.prepare('SELECT * FROM fixtures WHERE id=? AND finalized_at IS NOT NULL').bind(id) : db.prepare('SELECT * FROM fixtures WHERE finalized_at IS NOT NULL ORDER BY starts_at DESC LIMIT 1')).first<any>();
  if (!f) return Response.json({ error: 'No finalized fixture' }, { status: 404 });
  const all = await db.prepare("SELECT p.id,p.name,COALESCE(a.keen,0) registered,l.role,l.position FROM players p LEFT JOIN availability a ON a.player_id=p.id AND a.fixture_id=? LEFT JOIN lineup l ON l.player_id=p.id AND l.fixture_id=? ORDER BY CASE l.role WHEN 'selected' THEN 0 WHEN 'reserve' THEN 1 ELSE 2 END,CASE WHEN l.position IS NULL THEN 999999 ELSE l.position END,p.name").bind(f.id, f.id).all();
  const players = all.results.filter((p: any) => eligible(p.name, new Date(f.starts_at)));
  return Response.json({ fixture: f, players });
};
export const PUT: APIRoute = async ({ request, cookies, locals }) => {
  if (!await auth(cookies, locals) || !originOk(request, locals.runtime.env.ORIGIN)) return Response.json({ error: 'Unauthorized' }, { status: 401 }); const b = await request.json() as { fixtureId?: number; selected?: unknown; reserves?: unknown }; const db = getDb(locals);
  const f = await db.prepare('SELECT * FROM fixtures WHERE id=? AND finalized_at IS NOT NULL').bind(b.fixtureId).first<any>(); if (!f) return Response.json({ error: 'No finalized fixture' }, { status: 404 });
  const ps = await db.prepare('SELECT id,name FROM players').all<{ id: number; name: string }>(); const ids = new Set(ps.results.filter(p => eligible(p.name, new Date(f.starts_at))).map(p => p.id));
  if (!Array.isArray(b.selected) || !Array.isArray(b.reserves) || !validLineup(b.selected, b.reserves, ids)) return Response.json({ error: 'Lineup must contain unique eligible players and at most 10 selected.' }, { status: 409 });
  const registered = new Set([...b.selected, ...b.reserves]);
  await db.prepare('DELETE FROM lineup WHERE fixture_id=?').bind(f.id).run();
  const availability = [...ids].map(id => db.prepare('UPDATE availability SET keen=? WHERE fixture_id=? AND player_id=?').bind(registered.has(id) ? 1 : 0, f.id, id));
  const statements = [...b.selected.map((id: number, position: number) => db.prepare('INSERT INTO lineup(fixture_id,player_id,role,position) VALUES(?,?,?,?)').bind(f.id, id, 'selected', position)), ...b.reserves.map((id: number, position: number) => db.prepare('INSERT INTO lineup(fixture_id,player_id,role,position) VALUES(?,?,?,?)').bind(f.id, id, 'reserve', position))];
  if (availability.length) await db.batch(availability); if (statements.length) await db.batch(statements); return Response.json({ ok: true });
};
