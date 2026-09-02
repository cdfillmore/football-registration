import type { APIRoute } from 'astro';
import { getDb } from '../../db/client.js';
import { reconcileFixture } from '../../db/service.js';
import { availabilityOpen, fixtureDates, now, registrationClosesAt, registrationOpensAt } from '../../domain.js';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals); const at = now();
  const scheduledStart = fixtureDates().find(date => date > at);
  if (scheduledStart) await reconcileFixture(db, scheduledStart, at);
  const candidateRows = await db.prepare('SELECT * FROM fixtures WHERE finalized_at IS NULL AND starts_at > ? ORDER BY starts_at').bind(at.toISOString()).all<any>();
  const candidate = candidateRows.results[0];
  const useCandidate = candidate && (!scheduledStart || new Date(candidate.starts_at) <= scheduledStart);
  const f = useCandidate ? candidate : scheduledStart ? await db.prepare('SELECT * FROM fixtures WHERE starts_at=?').bind(scheduledStart.toISOString()).first<any>() : null;
  const start = f ? new Date(f.starts_at) : scheduledStart;
  if (!start) return Response.json({ fixture: null, players: [], open: false });
  const players = f ? await db.prepare('SELECT p.id,p.name,COALESCE(a.keen,0) keen FROM players p JOIN availability a ON a.player_id=p.id WHERE a.fixture_id=? ORDER BY p.name').bind(f.id).all() : { results: [] };
  const isTestFixture = Boolean(f && (!scheduledStart || new Date(f.starts_at).getTime() !== scheduledStart.getTime()));
  const testOpen = isTestFixture && locals.runtime.env.ENABLE_TEST_FIXTURE === 'true';
  const open = testOpen || ((!import.meta.env.PROD && start.getUTCDay() === 1) || availabilityOpen(at));
  return Response.json({ fixture: { id: f?.id ?? null, startsAt: start.toISOString(), registrationOpensAt: registrationOpensAt(start).toISOString(), registrationClosesAt: registrationClosesAt(start).toISOString() }, players: players.results, open }, { headers: { 'cache-control': 'no-store' } });
};
