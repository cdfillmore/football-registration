import { fixtureDates, eligible, draw, localDemo, now, validLineup } from '../domain.js';
import type { Database } from './client.js';

export async function reconcile(db: Database, at = now()) {
  for (const date of fixtureDates()) {
    if (!localDemo() && at < new Date(date.getTime() - 7 * 86400000)) continue;
    await materializeFixture(db, date, at);
  }
}

export async function reconcileFixture(db: Database, date: Date, at = now()) {
  if (!localDemo() && at < new Date(date.getTime() - 7 * 86400000)) return;
  await materializeFixture(db, date, at);
}

async function materializeFixture(db: Database, date: Date, at: Date) {
  const inserted = await db.prepare('INSERT OR IGNORE INTO fixtures(starts_at,materialized_at) VALUES (?,?)').bind(date.toISOString(), at.toISOString()).run();
  if (!inserted.meta.changes) return;
  const fixture = await db.prepare('SELECT id FROM fixtures WHERE starts_at=?').bind(date.toISOString()).first<{ id: number }>();
  if (!fixture) return;
  const people = await db.prepare('SELECT id,name FROM players').all<{ id: number; name: string }>();
  const statements = people.results.filter(p => eligible(p.name, date)).map(p => db.prepare('INSERT OR IGNORE INTO availability(fixture_id,player_id,keen) VALUES (?,?,0)').bind(fixture.id, p.id));
  if (statements.length) await db.batch(statements);
}

export async function finalize(db: Database, at = now()) {
  await reconcile(db, at);
  const fixtures = await db.prepare('SELECT id,starts_at FROM fixtures WHERE finalized_at IS NULL AND starts_at <= ?').bind(at.toISOString()).all<{ id: number; starts_at: string }>();
  for (const fixture of fixtures.results) {
    const keen = await db.prepare('SELECT player_id FROM availability WHERE fixture_id=? AND keen=1').bind(fixture.id).all<{ player_id: number }>();
    const result = draw(keen.results.map(row => row.player_id));
    const claim = await db.prepare('UPDATE fixtures SET finalized_at=? WHERE id=? AND finalized_at IS NULL').bind(at.toISOString(), fixture.id).run();
    if (!claim.meta.changes) continue;
    const statements = [...result.selected.map((id, position) => db.prepare('INSERT INTO lineup(fixture_id,player_id,role,position) VALUES (?,?,?,?)').bind(fixture.id, id, 'selected', position)), ...result.reserves.map((id, position) => db.prepare('INSERT INTO lineup(fixture_id,player_id,role,position) VALUES (?,?,?,?)').bind(fixture.id, id, 'reserve', position))];
    if (statements.length) await db.batch(statements);
  }
}

export { validLineup };
