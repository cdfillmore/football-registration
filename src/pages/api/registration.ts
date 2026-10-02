import type { APIRoute } from 'astro';
import { getDb } from '../../db/client.js';
import { reconcileFixture } from '../../db/service.js';
import { fixtureDates, now, registrationClosesAt, registrationOpenForFixture, registrationOpensAt } from '../../domain.js';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals); const at = now();
  const scheduledStart = fixtureDates().find(date => date > at);
  if (scheduledStart) await reconcileFixture(db, scheduledStart, at);
  const candidateRows = await db.prepare('SELECT * FROM fixtures WHERE finalized_at IS NULL AND starts_at > ? ORDER BY starts_at').bind(at.toISOString()).all<any>();
  const candidate = candidateRows.results[0];
  const selection = await db.prepare('SELECT * FROM fixtures WHERE finalized_at IS NOT NULL AND starts_at > ? ORDER BY starts_at LIMIT 1').bind(at.toISOString()).first<any>();
  const scheduled = scheduledStart ? await db.prepare('SELECT * FROM fixtures WHERE starts_at=?').bind(scheduledStart.toISOString()).first<any>() : null;
  const f = selection && (!candidate || new Date(selection.starts_at) <= new Date(candidate.starts_at)) ? selection : candidate ?? scheduled;
  const start = f ? new Date(f.starts_at) : scheduledStart;
  if (!start) return Response.json({ fixture: null, players: [], open: false });
  const players = f ? await db.prepare("SELECT p.id,p.name,COALESCE(a.keen,0) keen,l.role,l.position FROM players p JOIN availability a ON a.player_id=p.id LEFT JOIN lineup l ON l.player_id=p.id AND l.fixture_id=a.fixture_id WHERE a.fixture_id=? ORDER BY p.name").bind(f.id).all() : { results: [] };
  const finalized = Boolean(f?.finalized_at);
  const open = Boolean(f && !finalized && (registrationOpenForFixture(at, start) || (!import.meta.env.PROD && start.getUTCDay() === 1)));
  return Response.json({ fixture: { id: f?.id ?? null, startsAt: start.toISOString(), registrationOpensAt: registrationOpensAt(start).toISOString(), registrationClosesAt: registrationClosesAt(start).toISOString(), finalized }, players: players.results, open }, { headers: { 'cache-control': 'no-store' } });
};
