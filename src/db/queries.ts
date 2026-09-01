import type { Database } from './client.js';

type FixtureRow = { id: number; starts_at: string };
type PlayerRow = { id: number; name: string };
type LineupRow = { fixture_id: number; player_id: number; role: 'selected' | 'reserve'; position: number };

async function finalizedData(db: Database) {
  const [players, fixtures, lineups] = await Promise.all([
    db.prepare('SELECT id,name FROM players ORDER BY name').all<PlayerRow>(),
    db.prepare('SELECT id,starts_at FROM fixtures WHERE finalized_at IS NOT NULL ORDER BY starts_at').all<FixtureRow>(),
    db.prepare("SELECT fixture_id,player_id,role,position FROM lineup WHERE role IN ('selected','reserve') ORDER BY fixture_id,position").all<LineupRow>()
  ]);

  const names = new Map(players.results.map(player => [player.id, player.name]));
  const byFixture = new Map<number, LineupRow[]>();
  for (const lineup of lineups.results) {
    const rows = byFixture.get(lineup.fixture_id) ?? [];
    rows.push(lineup);
    byFixture.set(lineup.fixture_id, rows);
  }

  const history = fixtures.results.slice().reverse().map(fixture => {
    const rows = byFixture.get(fixture.id) ?? [];
    return {
      startsAt: fixture.starts_at,
      selected: rows.filter(row => row.role === 'selected').sort((a, b) => a.position - b.position).map(row => names.get(row.player_id)!).filter(Boolean),
      reserves: rows.filter(row => row.role === 'reserve').sort((a, b) => a.position - b.position).map(row => names.get(row.player_id)!).filter(Boolean)
    };
  });

  const roleByPlayerFixture = new Map(lineups.results.map(row => [`${row.player_id}:${row.fixture_id}`, row.role]));
  const statistics = {
    totalFixtures: fixtures.results.length,
    players: players.results.map(player => {
      const appearances = fixtures.results.map(fixture => roleByPlayerFixture.get(`${player.id}:${fixture.id}`) ?? null);
      return {
        name: player.name,
        selected: appearances.filter(role => role === 'selected').length,
        reserve: appearances.filter(role => role === 'reserve').length,
        appearances
      };
    }),
    fixtures: fixtures.results.map(fixture => ({ startsAt: fixture.starts_at }))
  };

  return { history, statistics };
}

export async function publicSummary(db: Database) {
  return finalizedData(db);
}

export async function history(db: Database) {
  return (await finalizedData(db)).history;
}

export async function statistics(db: Database) {
  return (await finalizedData(db)).statistics;
}
