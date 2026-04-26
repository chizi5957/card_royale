-- ─────────────────────────────────────────────────────────────────────────────
-- ML Tables: game_records, player_profiles, global_priors
-- ─────────────────────────────────────────────────────────────────────────────

-- game_records: one row per completed bot-mode game
CREATE TABLE IF NOT EXISTS game_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid REFERENCES auth.users(id),
  played_at        timestamptz NOT NULL DEFAULT now(),
  outcome          text NOT NULL CHECK (outcome IN ('bot_win', 'player_win', 'tie')),
  final_bot_score  int  NOT NULL,
  final_player_score int NOT NULL,
  total_rounds     int  NOT NULL,
  rounds           jsonb NOT NULL DEFAULT '[]',
  player_profile   jsonb NOT NULL DEFAULT '{}',
  bot_version      text NOT NULL
);

ALTER TABLE game_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_records_insert_own"
  ON game_records FOR INSERT
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "game_records_select_own"
  ON game_records FOR SELECT
  USING (player_id = auth.uid());

-- player_profiles: aggregated per-player stats
CREATE TABLE IF NOT EXISTS player_profiles (
  player_id              uuid PRIMARY KEY REFERENCES auth.users(id),
  games_played           int NOT NULL DEFAULT 0,
  win_rate               float,
  bracket_offset         float,
  avg_bid_ratio          float,
  tie_frequency          float,
  high_card_distribution float[],
  strategy_history       text[],
  last_seen              timestamptz,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_profiles_select_own"
  ON player_profiles FOR SELECT
  USING (player_id = auth.uid());

CREATE POLICY "player_profiles_insert_own"
  ON player_profiles FOR INSERT
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "player_profiles_update_own"
  ON player_profiles FOR UPDATE
  USING (player_id = auth.uid());

-- global_priors: population-level statistics, computed offline
CREATE TABLE IF NOT EXISTS global_priors (
  version                   bigint PRIMARY KEY,
  computed_at               timestamptz NOT NULL DEFAULT now(),
  population_bracket_offset float,
  strategy_distribution     jsonb,
  prize_bracket_behaviors   jsonb,
  exploit_patterns          text[],
  sample_size               int
);

ALTER TABLE global_priors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_priors_select_all"
  ON global_priors FOR SELECT
  USING (true);

-- Only service role inserts (no client-facing policy needed — service role bypasses RLS)

-- ─────────────────────────────────────────────────────────────────────────────
-- update_player_profile: upsert with EMA (alpha=0.3)
-- Called from the client after each game via supabase.rpc()
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_player_profile(
  p_player_id        uuid,
  p_bracket_offset   float,
  p_win              int,      -- 1 = player won, 0 = did not win
  p_avg_bid_ratio    float,
  p_tie_freq         float,
  p_strategy         text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alpha  constant float := 0.3;
  keep   constant float := 0.7;
BEGIN
  INSERT INTO player_profiles (
    player_id,
    games_played,
    win_rate,
    bracket_offset,
    avg_bid_ratio,
    tie_frequency,
    strategy_history,
    last_seen,
    updated_at
  ) VALUES (
    p_player_id,
    1,
    p_win::float,
    p_bracket_offset,
    p_avg_bid_ratio,
    p_tie_freq,
    ARRAY[p_strategy],
    now(),
    now()
  )
  ON CONFLICT (player_id) DO UPDATE SET
    games_played   = player_profiles.games_played + 1,
    win_rate       = player_profiles.win_rate       * keep + p_win::float    * alpha,
    bracket_offset = player_profiles.bracket_offset * keep + p_bracket_offset * alpha,
    avg_bid_ratio  = player_profiles.avg_bid_ratio  * keep + p_avg_bid_ratio  * alpha,
    tie_frequency  = player_profiles.tie_frequency  * keep + p_tie_freq       * alpha,
    -- Append new strategy, keep last 10 entries
    strategy_history = (
      SELECT ARRAY(
        SELECT unnest
        FROM unnest(
          array_append(player_profiles.strategy_history, p_strategy)
        ) WITH ORDINALITY AS t(unnest, ord)
        ORDER BY ord DESC
        LIMIT 10
      )
    ),
    last_seen  = now(),
    updated_at = now();
END;
$$;
