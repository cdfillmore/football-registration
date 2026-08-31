import type { APIRoute } from 'astro'; import { db } from '../../db/client.js';
export const GET: APIRoute = () => {
  const players = db.prepare('SELECT id,name FROM players ORDER BY name').all() as any[];
  const totalFixtures = (db.prepare('SELECT count(*) n FROM fixtures WHERE finalized_at IS NOT NULL').get() as any).n;
  const result = players.map(player => ({ name: player.name, selected: (db.prepare("SELECT count(*) n FROM lineup WHERE player_id=? AND role='selected'").get(player.id) as any).n, reserve: (db.prepare("SELECT count(*) n FROM lineup WHERE player_id=? AND role='reserve'").get(player.id) as any).n }));
  return Response.json({ totalFixtures, players: result }, { headers: { 'cache-control': 'no-store' } });
};
