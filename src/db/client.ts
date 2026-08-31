import Database from 'better-sqlite3'; import { mkdirSync } from 'node:fs'; import { dirname } from 'node:path';
const url=process.env.DATABASE_URL??'./data/football.db'; if(!url.startsWith(':memory:')) mkdirSync(dirname(url),{recursive:true});
export const db=new Database(url); db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON'); db.pragma('busy_timeout = 5000');
