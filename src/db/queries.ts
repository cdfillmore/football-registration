import type { Database } from './client.js';

export async function history(db: Database) {
  const fixtures = await db.prepare('SELECT id,starts_at FROM fixtures WHERE finalized_at IS NOT NULL ORDER BY starts_at DESC').all<{ id: number; starts_at: string }>();
  return fixtures.results.map(async f => ({
    startsAt: f.starts_at,
    selected: (await db.prepare("SELECT p.name FROM lineup l JOIN players p ON p.id=l.player_id WHERE l.fixture_id=? AND l.role='selected' ORDER BY position").bind(f.id).all<{ name: string }>()).results.map(p => p.name),
    reserves: (await db.prepare("SELECT p.name FROM lineup l JOIN players p ON p.id=l.player_id WHERE l.fixture_id=? AND l.role='reserve' ORDER BY position").bind(f.id).all<{ name: string }>()).results.map(p => p.name)
  })).reduce(async (acc, item) => [...await acc, await item], Promise.resolve([] as { startsAt: string; selected: string[]; reserves: string[] }[]));
}

export async function statistics(db: Database) {
  const players = await db.prepare('SELECT id,name FROM players ORDER BY name').all<{ id: number; name: string }>();
  const fixtureCount = await db.prepare('SELECT count(*) AS n FROM fixtures WHERE finalized_at IS NOT NULL').first<{ n: number }>();
  return { totalFixtures: fixtureCount?.n ?? 0, players: await Promise.all(players.results.map(async p => ({
    name: p.name,
    selected: (await db.prepare("SELECT count(*) AS n FROM lineup WHERE player_id=? AND role='selected'").bind(p.id).first<{ n: number }>())?.n ?? 0,
    reserve: (await db.prepare("SELECT count(*) AS n FROM lineup WHERE player_id=? AND role='reserve'").bind(p.id).first<{ n: number }>())?.n ?? 0
  })))};
}
