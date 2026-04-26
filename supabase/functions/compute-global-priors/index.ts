import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ── 1. Fetch all player_profiles where games_played >= 3 ────────────────
    const { data: profiles, error: profileErr } = await supabase
      .from("player_profiles")
      .select("player_id, games_played, bracket_offset, strategy_history")
      .gte("games_played", 3);

    if (profileErr) throw profileErr;

    // ── 2. populationBracketOffset — weighted average, weight = log(gamesPlayed) ─
    let weightedOffsetSum = 0;
    let totalWeight = 0;
    for (const p of profiles ?? []) {
      const w = Math.log(Math.max(p.games_played, 2));
      weightedOffsetSum += (p.bracket_offset ?? 0) * w;
      totalWeight += w;
    }
    const populationBracketOffset = totalWeight > 0 ? weightedOffsetSum / totalWeight : 0;

    // ── 3. strategyDistribution ──────────────────────────────────────────────
    const strategyCounts: Record<string, number> = {};
    let totalStrategyEntries = 0;
    for (const p of profiles ?? []) {
      for (const s of p.strategy_history ?? []) {
        strategyCounts[s] = (strategyCounts[s] ?? 0) + 1;
        totalStrategyEntries++;
      }
    }
    const strategyDistribution: Record<string, number> = {};
    for (const [k, v] of Object.entries(strategyCounts)) {
      strategyDistribution[k] = totalStrategyEntries > 0 ? v / totalStrategyEntries : 0;
    }

    // ── 4 & 5. Fetch last 5000 game_records, compute prizeBracketBehaviors ──
    const { data: gameRecords, error: gameErr } = await supabase
      .from("game_records")
      .select("rounds, outcome, player_profile")
      .order("played_at", { ascending: false })
      .limit(5000);

    if (gameErr) throw gameErr;

    // Bucket definitions
    const buckets: Record<string, number[]> = {
      "1-3": [], "4-5": [], "6-9": [], "10-12": [], "13": [],
    };

    function getBucketKey(prizeValue: number): string {
      if (prizeValue <= 3)  return "1-3";
      if (prizeValue <= 5)  return "4-5";
      if (prizeValue <= 9)  return "6-9";
      if (prizeValue <= 12) return "10-12";
      return "13";
    }

    function percentile(sorted: number[], p: number): number {
      if (sorted.length === 0) return 0;
      const idx = (p / 100) * (sorted.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    }

    for (const rec of gameRecords ?? []) {
      for (const round of (rec.rounds ?? []) as Array<{ prizeValue: number; humanBid: number }>) {
        const key = getBucketKey(round.prizeValue);
        buckets[key].push(round.humanBid);
      }
    }

    const prizeBracketBehaviors: Record<string, { mean: number; p25: number; p75: number }> = {};
    for (const [key, bids] of Object.entries(buckets)) {
      if (bids.length === 0) {
        prizeBracketBehaviors[key] = { mean: 0, p25: 0, p75: 0 };
        continue;
      }
      const sorted = [...bids].sort((a, b) => a - b);
      const mean = bids.reduce((s, v) => s + v, 0) / bids.length;
      prizeBracketBehaviors[key] = {
        mean,
        p25: percentile(sorted, 25),
        p75: percentile(sorted, 75),
      };
    }

    // ── 6. exploitPatterns: strategies that beat bot > 55% of the time ──────
    const strategyWins: Record<string, { wins: number; total: number }> = {};
    for (const rec of gameRecords ?? []) {
      const label = (rec.player_profile as { strategyLabel?: string })?.strategyLabel;
      if (!label) continue;
      if (!strategyWins[label]) strategyWins[label] = { wins: 0, total: 0 };
      strategyWins[label].total++;
      if (rec.outcome === "player_win") strategyWins[label].wins++;
    }
    const exploitPatterns: string[] = [];
    for (const [label, stats] of Object.entries(strategyWins)) {
      if (stats.total >= 10 && stats.wins / stats.total > 0.55) {
        exploitPatterns.push(label);
      }
    }

    // ── 7. Insert new global_priors row ──────────────────────────────────────
    const version = Math.floor(Date.now() / 1000); // epoch seconds
    const { error: insertErr } = await supabase.from("global_priors").insert({
      version,
      computed_at: new Date().toISOString(),
      population_bracket_offset: populationBracketOffset,
      strategy_distribution: strategyDistribution,
      prize_bracket_behaviors: prizeBracketBehaviors,
      exploit_patterns: exploitPatterns,
      sample_size: profiles?.length ?? 0,
    });

    if (insertErr) throw insertErr;

    // ── 8. Return summary ─────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        ok: true,
        version,
        profilesProcessed: profiles?.length ?? 0,
        gamesAnalyzed: gameRecords?.length ?? 0,
        populationBracketOffset,
        strategyDistribution,
        exploitPatterns,
        prizeBucketSizes: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, v.length]),
        ),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
