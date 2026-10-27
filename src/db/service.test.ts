import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from './client.js';
import { correctUpcomingFixtures, reconcileFixture } from './service.js';

// Execute the real D1 queries against SQLite, including uniqueness and foreign keys.
function asD1(sqlite: DatabaseSync): Database {
  return {
    prepare(sql: string) {
      let values: (string | number | null)[] = [];
      const statement = {
        bind(...args: typeof values) { values = args; return statement; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; }
      };
      return statement;
    },
    async batch(statements: { run(): Promise<unknown> }[]) { return Promise.all(statements.map(statement => statement.run())); }
  } as unknown as Database;
}

describe('stored fixture kickoff corrections', () => {
  let sqlite: DatabaseSync;
  let db: Database;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(readFileSync(new URL('../../migrations/0001_initial.sql', import.meta.url), 'utf8'));
    db = asD1(sqlite);
    sqlite.exec(`
      INSERT INTO fixtures(id,starts_at,materialized_at,finalized_at)
      VALUES (100,'2026-10-27T16:00:00.000Z','2026-10-20T16:00:00.000Z','2026-10-23T10:00:00.000Z');
      INSERT INTO availability(fixture_id,player_id,keen) VALUES (100,1,1);
      INSERT INTO lineup(fixture_id,player_id,role,position) VALUES (100,1,'selected',0);
    `);
  });

  afterEach(() => sqlite.close());

  it('corrects today even after the erroneous 17:00 Vienna kickoff has passed', async () => {
    await correctUpcomingFixtures(db, new Date('2026-10-27T16:30:00Z'));
    expect(sqlite.prepare('SELECT starts_at FROM fixtures WHERE id=100').get()?.starts_at).toBe('2026-10-27T17:00:00.000Z');
    expect(sqlite.prepare('SELECT finalized_at FROM fixtures WHERE id=100').get()?.finalized_at).toBe('2026-10-23T10:00:00.000Z');
    expect(sqlite.prepare('SELECT * FROM availability WHERE fixture_id=100').get()).toMatchObject({ player_id: 1, keen: 1 });
    expect(sqlite.prepare('SELECT * FROM lineup WHERE fixture_id=100').get()).toMatchObject({ player_id: 1, role: 'selected', position: 0 });
  });

  it('reconciles the corrected fixture repeatedly without creating a duplicate', async () => {
    const kickoff = new Date('2026-10-27T17:00:00Z');
    const at = new Date('2026-10-27T16:30:00Z');
    await reconcileFixture(db, kickoff, at);
    await reconcileFixture(db, kickoff, at);
    expect(sqlite.prepare('SELECT id,starts_at FROM fixtures').all()).toEqual([{ id: 100, starts_at: kickoff.toISOString() }]);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM availability').get()?.count).toBe(1);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM lineup').get()?.count).toBe(1);
  });

  it('corrects future Monday and Tuesday fixtures and leaves past matches alone', async () => {
    sqlite.exec(`
      INSERT INTO fixtures(id,starts_at,materialized_at) VALUES
        (101,'2026-10-20T16:00:00.000Z','2026-10-13T16:00:00.000Z'),
        (102,'2026-11-02T16:00:00.000Z','2026-10-26T16:00:00.000Z'),
        (103,'2026-11-03T16:00:00.000Z','2026-10-27T16:00:00.000Z');
    `);
    await correctUpcomingFixtures(db, new Date('2026-10-27T15:00:00Z'));
    expect(sqlite.prepare('SELECT starts_at FROM fixtures WHERE id=101').get()?.starts_at).toBe('2026-10-20T16:00:00.000Z');
    expect(sqlite.prepare('SELECT starts_at FROM fixtures WHERE id=102').get()?.starts_at).toBe('2026-11-02T17:00:00.000Z');
    expect(sqlite.prepare('SELECT starts_at FROM fixtures WHERE id=103').get()?.starts_at).toBe('2026-11-03T17:00:00.000Z');
  });
});
