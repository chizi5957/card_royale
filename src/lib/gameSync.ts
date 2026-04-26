import { supabase } from "./playerIdentity";
import * as gameStorage from "./gameStorage";
import type { GameRecord } from "./mlTypes";

export async function syncGameRecord(record: GameRecord): Promise<void> {
  try {
    const { error: insertError } = await supabase
      .from("game_records")
      .insert({
        player_id: record.playerId,
        played_at: new Date(record.timestamp).toISOString(),
        outcome: record.outcome,
        final_bot_score: record.finalBotScore,
        final_player_score: record.finalPlayerScore,
        total_rounds: record.totalRounds,
        rounds: record.rounds,
        player_profile: record.playerProfile,
        bot_version: record.botVersion,
      });

    if (insertError) throw insertError;

    const { error: rpcError } = await supabase.rpc("update_player_profile", {
      p_player_id: record.playerId,
      p_bracket_offset: record.playerProfile.bracketOffset,
      p_win: record.outcome === "player_win" ? 1 : 0,
      p_avg_bid_ratio: record.playerProfile.avgBidToPrizeRatio,
      p_tie_freq: record.playerProfile.tieFrequency,
      p_strategy: record.playerProfile.strategyLabel,
    });

    if (rpcError) throw rpcError;
  } catch {
    gameStorage.queueFailedSync(record);
  }
}

export async function retryFailedSyncs(): Promise<void> {
  const queue = gameStorage.getFailedSyncQueue();
  if (queue.length === 0) return;

  const succeeded: string[] = [];
  for (const record of queue) {
    try {
      const { error: insertError } = await supabase
        .from("game_records")
        .insert({
          player_id: record.playerId,
          played_at: new Date(record.timestamp).toISOString(),
          outcome: record.outcome,
          final_bot_score: record.finalBotScore,
          final_player_score: record.finalPlayerScore,
          total_rounds: record.totalRounds,
          rounds: record.rounds,
          player_profile: record.playerProfile,
          bot_version: record.botVersion,
        });

      if (insertError) continue;

      await supabase.rpc("update_player_profile", {
        p_player_id: record.playerId,
        p_bracket_offset: record.playerProfile.bracketOffset,
        p_win: record.outcome === "player_win" ? 1 : 0,
        p_avg_bid_ratio: record.playerProfile.avgBidToPrizeRatio,
        p_tie_freq: record.playerProfile.tieFrequency,
        p_strategy: record.playerProfile.strategyLabel,
      });

      succeeded.push(record.gameId);
    } catch {
      // leave in queue
    }
  }

  if (succeeded.length > 0) {
    // Rebuild queue without succeeded items
    const remaining = queue.filter(r => !succeeded.includes(r.gameId));
    try {
      localStorage.setItem("cardBattle_syncQueue", JSON.stringify(remaining));
    } catch {
      // fail silently
    }
  }
}

export async function refreshGlobalPriors(): Promise<void> {
  try {
    const local = await gameStorage.getGlobalPriors();
    const localVersion = local?.version ?? 0;

    const { data, error } = await supabase
      .from("global_priors")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return;

    if (data.version > localVersion) {
      const { data: full, error: fetchErr } = await supabase
        .from("global_priors")
        .select("*")
        .eq("version", data.version)
        .single();

      if (fetchErr || !full) return;

      await gameStorage.saveGlobalPriors({
        version: full.version,
        computedAt: new Date(full.computed_at).getTime(),
        sampleSize: full.sample_size,
        populationBracketOffset: full.population_bracket_offset,
        strategyDistribution: full.strategy_distribution,
        prizeBracketBehaviors: full.prize_bracket_behaviors,
        exploitPatterns: full.exploit_patterns ?? [],
      });
    }
  } catch {
    // fail silently
  }
}
