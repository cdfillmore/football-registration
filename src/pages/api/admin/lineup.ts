import type { APIRoute } from 'astro';
import { getDb } from '../../../db/client.js';
import { eligible, validLineup } from '../../../domain.js';
import { originOk, validCookie } from '../../../lib/http.js';
async function auth(cookies: any, locals: App.Locals) { return validCookie(cookies.get('admin_session')?.value, locals.runtime.env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? 'dev-secret'); }
export const GET: APIRoute = async ({ cookies, request, locals }) => {
  if (!await auth(cookies, locals)) return Response.json({ error: 'Unauthorized' }, { status: 401 }); const db = getDb(locals); const id = Number(new URL(request.url).searchParams.get('fixtureId'));
  const f = await (id ? db.prepare('SELECT * FROM fixtures WHERE id=? AND finalized_at IS NOT NULL').bind(id) : db.prepare('SELECT * FROM fixtures WHERE finalized_at IS NOT NULL ORDER BY starts_at DESC LIMIT 1')).first<any>();
  if (!f) return Response.json({ error: 'No finalized fixture' }, { status: 404 }); const players = await db.prepare("SELECT p.id,p.name,l.role,l.position FROM players p JOIN lineup l ON l.player_id=p.id WHERE l.fixture_id=? ORDER BY CASE l.role WHEN 'selected' THEN 0 ELSE 1 END,l.position").bind(f.id).all(); return Response.json({ fixture: f, players: players.results });
};
export const PUT: APIRoute = async ({ request, cookies, locals }) => {
  if (!await auth(cookies, locals) || !originOk(request, locals.runtime.env.ORIGIN)) return Response.json({ error: 'Unauthorized' }, { status: 401 }); const b = await request.json() as { fixtureId?: number; selected?: unknown; reserves?: unknown }; const db = getDb(locals);
  const f = await db.prepare('SELECT * FROM fixtures WHERE id=? AND finalized_at IS NOT NULL').bind(b.fixtureId).first<any>(); if (!f) return Response.json({ error: 'No finalized fixture' }, { status: 404 });
  const ps = await db.prepare('SELECT id,name FROM players').all<{ id: number; name: string }>(); const ids = new Set(ps.results.filter(p => eligible(p.name, new Date(f.starts_at))).map(p => p.id));
  if (!Array.isArray(b.selected) || !Array.isArray(b.reserves) || !validLineup(b.selected, b.reserves, ids)) return Response.json({ error: 'Lineup must contain unique eligible players and at most 10 selected.' }, { status: 409 });
  await db.prepare('DELETE FROM lineup WHERE fixture_id=?').bind(f.id).run(); const statements = [...b.selected.map((id: number, position: number) => db.prepare('INSERT INTO lineup(fixture_id,player_id,role,position) VALUES(?,?,?,?)').bind(f.id, id, 'selected', position)), ...b.reserves.map((id: number, position: number) => db.prepare('INSERT INTO lineup(fixture_id,player_id,role,position) VALUES(?,?,?,?)').bind(f.id, id, 'reserve', position))]; if (statements.length) await db.batch(statements); return Response.json({ ok: true });
};
