// ╔════════════════════════════════════════════════════════════════════╗
// ║  BOT BRAIN — how the computer opponent decides which card to play   ║
// ║                                                                      ║
// ║  This game is "Goofspiel" (Game Of Pure Strategy), a classic from   ║
// ║  game theory. The bot plays like a seasoned human, using ONLY       ║
// ║  information a human opponent would also have:                      ║
// ║    • its own hand                                                   ║
// ║    • which cards the player has left (both hands start known)      ║
// ║    • prizes revealed so far, and the current pot                   ║
// ║    • the player's PAST bids (revealed after each round)            ║
// ║                                                                      ║
// ║  It NEVER sees the card the player picked this round. No cheating. ║
// ║                                                                      ║
// ║  The strategy, in plain English:                                    ║
// ║   1. RANK-MATCHING — a card is worth what it can win later. The    ║
// ║      King is saved for the biggest pot still expected to appear;   ║
// ║      mid cards fight for mid pots. (No more King on a 9.)          ║
// ║   2. OPPONENT MODEL — after every round the bot compares what you  ║
// ║      bid with what a "textbook" player would have bid, learns your ║
// ║      habit (overbidder? underbidder? dumper?), and predicts your   ║
// ║      next bid.                                                     ║
// ║   3. CONTEST OR SACRIFICE — beat your predicted bid by the         ║
// ║      thinnest possible margin, or throw its cheapest card away    ║
// ║      and save strength. Never overpay.                             ║
// ║   4. CONTROLLED RANDOMNESS — occasionally shifts its bid so you    ║
// ║      can't reverse-engineer the pattern and exploit it.            ║
// ╚════════════════════════════════════════════════════════════════════╝

import type {
  AggregatedPlayerProfile,
  GlobalPriors,
  GameRecord,
  StrategyLabel,
} from "../lib/mlTypes";

export const BOT_VERSION = "gops-v2";

// ── Shared types (GameBoard.tsx and mlTypes.ts import these) ─────────────

export interface Card {
  rank: string;
  suit?: string;
  value: number; // A=1 .. K=13
}

export interface RoundResult {
  round: number;
  prizeValue: number;          // total points at stake that round (incl. carryover)
  botBid: Card;
  humanBid: Card;
  result: "human" | "bot" | "tie";
}

export interface SelectCardInput {
  botHand: Card[];
  humanCardsRemaining: Card[];
  currentPrize: Card | null;
  carriedOverPrizes: Card[];
  botScore: number;
  humanScore: number;
  roundNumber: number;
}

export interface RoundRecord {
  roundNumber: number;
  prizeValue: number;
  botBid: number;
  humanBid: number;
  result: "human" | "bot" | "tie";
  potValue: number;
  tacticUsed: string;
}

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function makeCard(value: number): Card {
  return { rank: RANKS[value - 1], value };
}

// ═══════════════════════════════════════════════════════════════════════
//  The bot
// ═══════════════════════════════════════════════════════════════════════

export class BotBrain {
  // Full round-by-round log (also exported for ML after the game)
  private history: RoundRecord[] = [];

  // Which prize cards (of the 26 in the deck) have been revealed.
  // Keyed "suit:rank" so hearts-9 and diamonds-9 count separately.
  private seenPrizes = new Set<string>();

  // ── Opponent model ──────────────────────────────────────────────────
  // offsetEma: how far above/below "textbook" the player usually bids.
  //   +2 means they typically bid 2 ranks higher than a textbook player.
  // absErrEma: how wrong our predictions have been (their consistency).
  //   Low = predictable player, we can cut margins razor-thin.
  private offsetEma = 0;
  private absErrEma = 2;
  private samples = 0;

  // People treat pot sizes differently (fight the big ones, dump the small
  // ones), so we ALSO learn a separate habit per pot size. "top" = the
  // biggest pot still expected, "small" = pots worth ≤5, "mid" = the rest.
  private bucketOffset: Record<string, number> = { small: 0, mid: 0, top: 0 };
  private bucketSamples: Record<string, number> = { small: 0, mid: 0, top: 0 };

  // What we predicted last round — checked against reality in recordRound
  private lastPrediction: { fairTheirs: number; predicted: number; bucket: string } | null = null;
  private lastTactic = "";

  // ML bookkeeping
  private mlSacrificeCount = 0;
  private mlHighCardRounds: number[] = [];

  // Priors loaded from storage (results of previous games vs this player)
  private profile: AggregatedPlayerProfile | null = null;
  private priors: GlobalPriors | null = null;

  reset() {
    this.history = [];
    this.seenPrizes = new Set();
    this.offsetEma = 0;
    this.absErrEma = 2;
    this.samples = 0;
    this.bucketOffset = { small: 0, mid: 0, top: 0 };
    this.bucketSamples = { small: 0, mid: 0, top: 0 };
    this.lastPrediction = null;
    this.lastTactic = "";
    this.mlSacrificeCount = 0;
    this.mlHighCardRounds = [];
  }

  initializeWithProfile(profile: AggregatedPlayerProfile | null) {
    if (!profile) return;
    this.profile = profile;
    // Seed the model with this player's known habit — worth ~2 rounds of data
    if (typeof profile.bracketOffset === "number") {
      this.offsetEma = profile.bracketOffset;
      this.samples = 2;
    }
  }

  initializeWithGlobalPriors(priors: GlobalPriors | null) {
    if (!priors) return;
    this.priors = priors;
    // Population-level habit — weakest prior, used only with no personal data
    if (this.samples === 0 && typeof priors.populationBracketOffset === "number") {
      this.offsetEma = priors.populationBracketOffset;
      this.samples = 1;
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  selectCard — called once per round. Returns the bot's bid.
  // ═════════════════════════════════════════════════════════════════════
  selectCard(input: SelectCardInput): Card {
    const { botHand, humanCardsRemaining, currentPrize, carriedOverPrizes, botScore, humanScore } = input;
    if (!botHand.length) throw new Error("Bot has no cards remaining.");

    // Remember every prize card we've now seen (for deck counting)
    if (currentPrize) this.notePrize(currentPrize);
    for (const p of carriedOverPrizes) this.notePrize(p);

    const myHand = botHand.map((c) => c.value).sort((a, b) => a - b);
    const theirHand = humanCardsRemaining.map((c) => c.value).sort((a, b) => a - b);
    const pot = (currentPrize?.value ?? 0) + carriedOverPrizes.reduce((s, c) => s + c.value, 0);
    const roundsLeft = myHand.length;

    // ── Forced move: one card left ─────────────────────────────────────
    if (myHand.length === 1) return this.finish(myHand[0], "forced");

    // ── Game already decided? Stop spending good cards ────────────────
    // The absolute most the trailing side could still score:
    const maxFuturePoints = pot + (roundsLeft - 1) * 13;
    if (botScore - humanScore > maxFuturePoints) {
      return this.finish(myHand[0], "coast_won"); // victory locked — dump cheap
    }

    // ── Total domination: every card we hold beats their best ─────────
    if (theirHand.length > 0 && myHand[0] > theirHand[theirHand.length - 1]) {
      return this.finish(myHand[0], "dominate"); // cheapest card still wins
    }

    // ── 1. RANK-MATCHING: which of my cards "deserves" this pot? ──────
    // Count how many future pots are expected to be bigger than this one.
    // If ~3 bigger pots are coming, this pot deserves my 4th-best card.
    const unseen = this.unseenPrizeValues();
    const biggerFrac = unseen.length > 0 ? unseen.filter((v) => v > pot).length / unseen.length : 0;
    const expectedBigger = Math.round((roundsLeft - 1) * biggerFrac);
    const fairMine = this.nthHighest(myHand, expectedBigger + 1);

    // ── 2. PREDICT the player's bid (fair: uses only revealed info) ────
    const fairTheirs = this.nthHighest(theirHand, Math.min(expectedBigger + 1, theirHand.length));
    // Use the habit we've learned for THIS pot size once we have enough
    // data on it; fall back to their overall habit before that.
    const bucket = expectedBigger === 0 ? "top" : pot <= 5 ? "small" : "mid";
    const offset =
      this.bucketSamples[bucket] >= 2 ? this.bucketOffset[bucket] : this.offsetEma;
    const predicted = this.nearestIn(theirHand, fairTheirs + offset);
    this.lastPrediction = { fairTheirs, predicted, bucket };

    // Safety margin: vs an erratic player leave room; vs a predictable
    // player cut it thin. (absErrEma is our recent prediction error.)
    // With no data yet, trust the textbook prediction — beating it by 1
    // is exactly how a seasoned player opens.
    const margin = this.samples < 3 ? 0 : Math.min(2, Math.round(this.absErrEma * 0.5));

    // Cheapest card that beats their predicted bid (+ margin)
    const cheapWin =
      this.cheapestAbove(myHand, predicted + margin) ??
      this.cheapestAbove(myHand, predicted);

    // ── 3. CONTEST or SACRIFICE ────────────────────────────────────────
    // How much over "fair" we're willing to pay, in card ranks:
    const bigPot = pot >= 11 || expectedBigger === 0; // top-tier or tie-inflated pot
    const behind = humanScore - botScore;
    const desperate = roundsLeft <= 5 && behind > roundsLeft * 3;
    const comfortable = botScore - humanScore > roundsLeft * 3;
    let slack = bigPot ? 3 : 1;
    if (desperate) slack += 1;      // behind late — take risks on big pots
    if (comfortable) slack -= 1;    // ahead — never overpay, protect the lead
    if (this.samples >= 4 && this.absErrEma <= 1) slack += 1; // we've decoded
    // their pattern — paying one extra rank for a near-certain win is worth it

    let choice: number;
    let tactic: string;

    if (cheapWin !== null && cheapWin <= pot) {
      // Free money: winning card costs fewer ranks than the pot pays.
      // This is how pros farm the small pots everyone else dumps on.
      choice = cheapWin;
      tactic = "cheap_steal";
    } else if (cheapWin !== null && cheapWin <= fairMine + slack) {
      // Fight for it, by the thinnest margin our prediction allows
      choice = cheapWin;
      tactic = "contest";
    } else if (bigPot && cheapWin !== null && !comfortable) {
      // Huge pot we can still win — pay up rather than let it go
      choice = cheapWin;
      tactic = "big_pot_reach";
    } else if (this.absErrEma >= 2.2 && pot >= 5) {
      // Erratic player — predictions are unreliable, so don't fold good
      // pots to a coin flip. Play the "textbook" card for this pot:
      // it wins whenever their random-ish bid lands below it.
      choice = fairMine;
      tactic = "fair_stand";
    } else {
      // Not worth it (or unwinnable) — throw the cheapest card away.
      // Losing a small pot while they burn a big card is a WIN for us.
      choice = myHand[0];
      tactic = "sacrifice";
    }

    // ── 4. CONTROLLED RANDOMNESS (anti-exploitation) ──────────────────
    // Sometimes shift one step so a sharp human can't map our pattern.
    // Never in the endgame, never when it would turn a win into a loss.
    if (myHand.length > 3 && Math.random() < 0.2) {
      const idx = myHand.indexOf(choice);
      if (tactic === "sacrifice" && idx + 1 < myHand.length && myHand[idx + 1] <= pot) {
        // Occasionally bid one up on a "dump" round — snipes players who
        // learned to grab our sacrificed pots with their second-lowest card
        choice = myHand[idx + 1];
        tactic = "sacrifice_snipe";
      } else if (tactic === "contest" && idx + 1 < myHand.length && myHand[idx + 1] <= fairMine + slack + 1) {
        choice = myHand[idx + 1]; // shift up, still efficient — never down below cheapWin
        tactic = "contest_jitter";
      }
    }

    // ── 5. EFFICIENT LOCK — never overpay for certainty ───────────────
    // Card counting: if we hold a card the player can no longer beat
    // (their higher cards are already spent), that card is enough.
    // Worst case it TIES — and a tie carries the pot to the next round,
    // where we still hold our even bigger cards. Example: their King is
    // gone, we hold Q and K → play Q, keep the K for a bigger fight.
    // (Skipped when contesting is not the plan — dumps stay cheap.)
    if (
      roundsLeft > 1 &&
      theirHand.length > 0 &&
      tactic !== "sacrifice" &&
      tactic !== "sacrifice_snipe"
    ) {
      const theirMax = theirHand[theirHand.length - 1];
      const cannotLose = this.cheapestAtLeast(myHand, theirMax);
      if (cannotLose !== null && choice > cannotLose) {
        choice = cannotLose;
        tactic = "efficient_lock";
      }
    }

    return this.finish(choice, tactic);
  }

  // ═════════════════════════════════════════════════════════════════════
  //  recordRound — called after each reveal. This is where learning happens.
  // ═════════════════════════════════════════════════════════════════════
  recordRound(r: RoundResult) {
    this.history.push({
      roundNumber: r.round,
      prizeValue: r.prizeValue,
      botBid: r.botBid.value,
      humanBid: r.humanBid.value,
      result: r.result,
      potValue: r.prizeValue,
      tacticUsed: this.lastTactic,
    });

    // Update the opponent model with what they ACTUALLY bid
    if (this.lastPrediction) {
      const { fairTheirs, predicted, bucket } = this.lastPrediction;
      const offsetSample = r.humanBid.value - fairTheirs;
      const errSample = Math.abs(r.humanBid.value - predicted);
      // EMA: recent rounds matter more than old ones (habits shift mid-game)
      const a = 0.3;
      this.offsetEma = (1 - a) * this.offsetEma + a * offsetSample;
      this.absErrEma = (1 - a) * this.absErrEma + a * errSample;
      // Pot-size-specific habit learns faster (fewer samples per bucket)
      const b = 0.5;
      this.bucketOffset[bucket] = (1 - b) * this.bucketOffset[bucket] + b * offsetSample;
      this.bucketSamples[bucket] += 1;
      this.samples += 1;
      this.lastPrediction = null;
    }

    // ML bookkeeping about the HUMAN's style
    if (r.humanBid.value <= 3 && r.prizeValue >= 5) this.mlSacrificeCount += 1;
    if (r.humanBid.value >= 10) this.mlHighCardRounds.push(this.history.length - 1);
  }

  // ═════════════════════════════════════════════════════════════════════
  //  ML / analytics methods (used by gameStorage + gameSync)
  // ═════════════════════════════════════════════════════════════════════

  classifyStrategy(): string {
    const n = this.history.length;
    if (n < 3) return "ADAPTIVE";
    const sacrificeFreq = this.mlSacrificeCount / n;
    if (this.offsetEma > 1.5) return "AGGRESSOR";
    if (this.offsetEma < -1.5) return "CONSERVATIONIST";
    if (sacrificeFreq > 0.35) return "CALCULATOR";   // strategic dumper
    if (this.absErrEma <= 1.2) return "REACTIVE";     // very predictable
    if (this.absErrEma >= 3) return "CHAOTIC";
    return "ADAPTIVE";
  }

  exportGameRecord(
    playerId: string,
    outcome: "player_win" | "bot_win" | "tie",
    finalBotScore: number,
    finalPlayerScore: number,
  ): GameRecord {
    const n = Math.max(this.history.length, 1);
    const avgBidRatio =
      this.history.reduce((s, r) => s + r.humanBid / Math.max(r.potValue, 1), 0) / n;
    const tieFreq = this.history.filter((r) => r.result === "tie").length / n;

    return {
      gameId: crypto.randomUUID(),
      playerId,
      timestamp: Date.now(),
      outcome,
      finalBotScore,
      finalPlayerScore,
      totalRounds: this.history.length,
      botVersion: BOT_VERSION,
      rounds: this.history,
      playerProfile: {
        bracketOffset: this.offsetEma,
        avgBidToPrizeRatio: avgBidRatio,
        tieFrequency: tieFreq,
        strategyLabel: this.classifyStrategy() as StrategyLabel,
        sacrificeFrequency: this.mlSacrificeCount / n,
        highCardRounds: this.mlHighCardRounds,
        dominanceResponseMatrix: {},
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Small helpers
  // ═════════════════════════════════════════════════════════════════════

  private notePrize(p: Card) {
    this.seenPrizes.add(`${p.suit ?? "?"}:${p.rank}`);
  }

  // The prize deck holds two of each value 1–13 (hearts + diamonds).
  // Return the values still hidden in it.
  private unseenPrizeValues(): number[] {
    const counts = new Map<number, number>();
    for (let v = 1; v <= 13; v++) counts.set(v, 2);
    for (const key of this.seenPrizes) {
      const rank = key.split(":")[1];
      const v = RANKS.indexOf(rank) + 1;
      if (v >= 1 && counts.get(v)! > 0) counts.set(v, counts.get(v)! - 1);
    }
    const out: number[] = [];
    for (const [v, c] of counts) for (let i = 0; i < c; i++) out.push(v);
    return out;
  }

  // n-th highest card in a sorted-ascending hand (n=1 → biggest)
  private nthHighest(sortedHand: number[], n: number): number {
    const idx = Math.max(0, sortedHand.length - n);
    return sortedHand[Math.min(idx, sortedHand.length - 1)];
  }

  // Cheapest card strictly above a threshold, or null
  private cheapestAbove(sortedHand: number[], threshold: number): number | null {
    for (const v of sortedHand) if (v > threshold) return v;
    return null;
  }

  // Cheapest card at-or-above a threshold ("cannot lose" card), or null
  private cheapestAtLeast(sortedHand: number[], threshold: number): number | null {
    for (const v of sortedHand) if (v >= threshold) return v;
    return null;
  }

  // The card in a hand closest to a target value
  private nearestIn(sortedHand: number[], target: number): number {
    let best = sortedHand[0];
    for (const v of sortedHand) {
      if (Math.abs(v - target) < Math.abs(best - target)) best = v;
    }
    return best;
  }

  private finish(value: number, tactic: string): Card {
    this.lastTactic = tactic;
    return makeCard(value);
  }
}
