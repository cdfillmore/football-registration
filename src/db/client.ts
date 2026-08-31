export type Database = D1Database;

export function getDb(locals: App.Locals): Database {
  return locals.runtime.env.football_registration;
}
