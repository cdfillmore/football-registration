import type { APIRoute } from 'astro';
import { getDb } from '../../db/client.js';
import { availabilityOpen, now } from '../../domain.js';
import { originOk } from '../../lib/http.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json() as { playerId?: unknown; keen?: unknown };
  if (!Number.isInteger(body.playerId) || typeof body.keen !== 'boolean') return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const db = getDb(locals); const at = now();
  const f = await db.prepare('SELECT id,starts_at FROM fixtures WHERE finalized_at IS NULL AND starts_at > ? ORDER BY starts_at LIMIT 1').bind(at.toISOString()).first<any>();
  const testOpen = locals.runtime.env.ENABLE_TEST_FIXTURE === 'true';
  const open = f && (testOpen || ((!import.meta.env.PROD && new Date(f.starts_at).getUTCDay() === 1) || availabilityOpen(at)));
  if (!originOk(request, locals.runtime.env.ORIGIN) || !open) return Response.json({ error: 'Registration is closed.' }, { status: 409 });
  const p = await db.prepare('SELECT id FROM players WHERE id=?').bind(body.playerId).first<{ id: number }>();
  if (!f || !p) return Response.json({ error: 'Player or fixture is unavailable.' }, { status: 409 });
  await db.prepare('UPDATE availability SET keen=? WHERE fixture_id=? AND player_id=?').bind(body.keen ? 1 : 0, f.id, p.id).run();
  return Response.json({ ok: true });
};
