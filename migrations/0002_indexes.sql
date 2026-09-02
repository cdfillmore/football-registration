CREATE INDEX IF NOT EXISTS idx_fixtures_finalized_starts ON fixtures(finalized_at, starts_at);
CREATE INDEX IF NOT EXISTS idx_availability_fixture_keen ON availability(fixture_id, keen);
CREATE INDEX IF NOT EXISTS idx_availability_player_fixture ON availability(player_id, fixture_id);
CREATE INDEX IF NOT EXISTS idx_lineup_fixture_role_position ON lineup(fixture_id, role, position);
CREATE INDEX IF NOT EXISTS idx_lineup_player_fixture ON lineup(player_id, fixture_id);
