// ─────────────────────────────────────────────────────────────────────────────
// Card Battle — Bot Brain v2
// BOT_VERSION bumped whenever strategy logic changes significantly
export const BOT_VERSION = "v2.0.0";

import type {
  GameRecord,
  AggregatedPlayerProfile,
  GlobalPriors,
  PlayerProfile,
  DominanceResponseMatrix,
  StrategyLabel,
  GameOutcome,
} from "../lib/mlTypes";
// ─────────────────────────────────────────────────────────────────────────────
// Card Battle — Bot Brain v2 (continued)
// Framework: Dominance-State Engine + Prize Bracket Predictor + Phase Governor
//
// Core philosophy: The game is won by answering one question correctly every
// round — "Who has the tie-breaking advantage right now, and what does that
// mean I should do?" Point thresholds are secondary. Structural card advantage
// drives every decision.
//
// A=1, 2–10=face, J=11, Q=12, K=13
// ─────────────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: "hearts" | "diamonds" | "spades" | "clubs";
  value: number;
}

export interface RoundRecord {
  round: number;
  prizeValue: number;
  botBid: number;
  humanBid: number;
  result: "bot" | "human" | "tie";
}

export interface BotBrainInput {
  botHand: Card[];
  humanCardsRemaining: Card[];
  currentPrize: Card | null;
  carriedOverPrizes: Card[];
  botScore: number;
  humanScore: number;
  roundNumber: number;
}

export interface RoundResult {
  round: number;
  prizeValue: number;
  botBid: Card;
  humanBid: Card;
  result: "bot" | "human" | "tie";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DominanceState =
  | "STRONG_ADVANTAGE"
  | "SLIGHT_ADVANTAGE"
  | "NEUTRAL"
  | "SLIGHT_DISADVANTAGE"
  | "STRONG_DISADVANTAGE";

type Confidence = "HIGH" | "MEDIUM" | "LOW";

type GamePhase = "CALIBRATION" | "ESTABLISHMENT" | "EXECUTION" | "LOCKDOWN";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sorted(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.value - b.value);
}

function avg(cards: Card[]): number {
  if (cards.length === 0) return 7;
  return cards.reduce((s, c) => s + c.value, 0) / cards.length;
}

function totalPrizeValue(currentPrize: Card | null, carried: Card[]): number {
  return (currentPrize?.value ?? 0) + carried.reduce((s, c) => s + c.value, 0);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIZE BRACKET PREDICTOR
//
// Humans anchor their bids to the prize card value. This is the most reliable
// behavioral constant in the game. The bracket gives us the likely range of
// the human's bid, which we then refine using observed offset data.
// ─────────────────────────────────────────────────────────────────────────────

interface Bracket {
  low: number;
  mid: number;
  high: number;
}

function getPrizeBracket(prizeValue: number): Bracket {
  if (prizeValue <= 3)  return { low: 1,  mid: 2,  high: 4  };
  if (prizeValue <= 5)  return { low: 3,  mid: 5,  high: 7  };
  if (prizeValue <= 9)  return { low: 4,  mid: 7,  high: 11 };
  if (prizeValue <= 12) return { low: 8,  mid: 10, high: 13 };
  return                       { low: 11, mid: 12, high: 13 };
}

// ─────────────────────────────────────────────────────────────────────────────
export class BotBrain {

  // ── Persistent state across a game session ───────────────────────────────
  private history: RoundRecord[] = [];

  // Bracket offset: running adjustment to bracket predictions
  // Positive = human bids above bracket midpoint consistently
  // Negative = human bids below bracket midpoint consistently
  private bracketOffset = 0;
  private offsetSampleCount = 0;

  // Dominance tracking
  private botHighestPlayedCard = 0;
  private humanHighestPlayedCard = 0;

  // Bleed and Sweep state
  private bleedExecuted = false;
  private bleedRound: number | null = null;
  private bleedSuccessful = false;
  private inBleedPhase2 = false;
  private tieChainActive = false;
  private tieChainPotValue = 0;

  // ── ML tracking fields (instrumentation only — no logic changes) ─────────
  private mlDominanceResponseMap: Record<string, { count: number; humanBidSum: number; humanBidAbovePrediction: number }> = {};
  private mlSacrificeCount = 0;   // human played <3 on prize >8
  private mlHighCardRounds: number[] = []; // rounds where human played >=10

  // Cross-game priors (set by initializeWithProfile / initializeWithGlobalPriors)
  private profileLoaded = false;
  private priorDominanceMatrix: DominanceResponseMatrix = {};
  private priorHighCardDistribution: number[] = new Array(13).fill(0);
  private strategyHypothesis: StrategyLabel | null = null;
  private globalPrizeBracketBehaviors: Record<string, { mean: number; p25: number; p75: number }> | null = null;

  // ── Reset between games ───────────────────────────────────────────────────
  reset() {
    this.history = [];
    this.bracketOffset = 0;
    this.offsetSampleCount = 0;
    this.botHighestPlayedCard = 0;
    this.humanHighestPlayedCard = 0;
    this.bleedExecuted = false;
    this.bleedRound = null;
    this.bleedSuccessful = false;
    this.inBleedPhase2 = false;
    this.tieChainActive = false;
    this.tieChainPotValue = 0;
    // Reset ML tracking (priors persist across reset — set by initialize*)
    this.mlDominanceResponseMap = {};
    this.mlSacrificeCount = 0;
    this.mlHighCardRounds = [];
    this.profileLoaded = false;
    this.priorDominanceMatrix = {};
    this.priorHighCardDistribution = new Array(13).fill(0);
    this.strategyHypothesis = null;
    this.globalPrizeBracketBehaviors = null;
  }

  // ── Called after every round resolves ────────────────────────────────────
  recordRound(r: RoundResult) {
    this.history.push({
      round: r.round,
      prizeValue: r.prizeValue,
      botBid: r.botBid.value,
      humanBid: r.humanBid.value,
      result: r.result,
    });

    // Track highest cards played by each side
    if (r.botBid.value   > this.botHighestPlayedCard)   this.botHighestPlayedCard   = r.botBid.value;
    if (r.humanBid.value > this.humanHighestPlayedCard) this.humanHighestPlayedCard = r.humanBid.value;

    // Update bracket offset
    const bracket = getPrizeBracket(r.prizeValue);
    const deviation = r.humanBid.value - bracket.mid;

    // ── ML instrumentation (additive — no logic changes) ──────────────────
    // High-card round tracking
    if (r.humanBid.value >= 10) this.mlHighCardRounds.push(r.round);
    // Sacrifice detection: human played <3 on a prize >8
    if (r.humanBid.value < 3 && r.prizeValue > 8) this.mlSacrificeCount++;
    // Dominance response tracking
    const domState = this._getDominanceState(0, 0, 0, r.round);
    const mlKey = domState as string;
    if (!this.mlDominanceResponseMap[mlKey]) {
      this.mlDominanceResponseMap[mlKey] = { count: 0, humanBidSum: 0, humanBidAbovePrediction: 0 };
    }
    const predictedMid = clamp(Math.round(bracket.mid + this.bracketOffset), bracket.low, bracket.high);
    this.mlDominanceResponseMap[mlKey].count++;
    this.mlDominanceResponseMap[mlKey].humanBidSum += r.humanBid.value;
    if (r.humanBid.value > predictedMid) this.mlDominanceResponseMap[mlKey].humanBidAbovePrediction++;
    // Weighted rolling average — recent rounds matter more
    const weight = 1 + (r.round / 13); // later rounds get more weight
    this.bracketOffset = (this.bracketOffset * this.offsetSampleCount + deviation * weight)
      / (this.offsetSampleCount + weight);
    this.offsetSampleCount += weight;

    // Resolve bleed phase 1 outcome
    if (this.bleedExecuted && this.bleedRound === r.round && !this.bleedSuccessful) {
      if (r.humanBid.value >= 9) {
        this.bleedSuccessful = true;
        this.inBleedPhase2 = true;
        this.tieChainPotValue = r.prizeValue; // initialise pot
      }
      // else: bleed failed — human also played low, abandon strategy
    }

    // Phase 2 tie chain tracking
    if (this.inBleedPhase2) {
      if (r.result === "tie") {
        this.tieChainPotValue += r.prizeValue;
      } else {
        // Chain broken — exit regardless of winner
        this.inBleedPhase2 = false;
        this.tieChainActive = false;
      }
    }
  }

  // ── MAIN ENTRY POINT ──────────────────────────────────────────────────────
  selectCard(input: BotBrainInput): Card {
    const {
      botHand,
      humanCardsRemaining,
      currentPrize,
      carriedOverPrizes,
      botScore,
      humanScore,
      roundNumber,
    } = input;

    if (botHand.length === 0) throw new Error("Bot has no cards remaining");

    const asc     = sorted(botHand);
    const lowest  = asc[0];
    const highest = asc[asc.length - 1];
    const median  = asc[Math.floor(asc.length / 2)];

    // ── Core metrics ────────────────────────────────────────────────────────
    const currentPrizeValue  = totalPrizeValue(currentPrize, carriedOverPrizes);
    const roundsRemaining    = 13 - roundNumber; // rounds AFTER this one
    const leadGap            = botScore - humanScore;
    const botRemainingMax    = highest.value;
    const humanRemainingMax  = humanCardsRemaining.length > 0
      ? Math.max(...humanCardsRemaining.map(c => c.value))
      : 0;

    // ── Phase governor ───────────────────────────────────────────────────────
    const phase = this._getPhase(roundNumber);

    // ── Dominance state ──────────────────────────────────────────────────────
    const dominance = this._getDominanceState(
      leadGap,
      botRemainingMax,
      humanRemainingMax,
      roundNumber,
    );

    // ── Prize bracket prediction ─────────────────────────────────────────────
    const bracket = getPrizeBracket(currentPrizeValue);
    const { predictedHumanBid, confidence } = this._predictHumanBid(
      bracket,
      humanCardsRemaining,
      roundNumber,
    );

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1: CALIBRATION (Rounds 1–3)
    // Goal: gather information. Do not commit high cards. Observe bracket fit.
    // ════════════════════════════════════════════════════════════════════════
    if (phase === "CALIBRATION") {
      // Exception: never fully gift a 13-value prize even in calibration
      if (currentPrizeValue >= 13) {
        return this._pickExactOrNearest(asc, 9) ?? median;
      }
      // Play bracket midpoint - 1 (slightly below prediction — likely lose,
      // but observe what human plays to calibrate the offset)
      const calibrationTarget = clamp(bracket.mid - 1, 1, 13);
      return this._pickExactOrNearest(asc, calibrationTarget) ?? lowest;
    }

    // ════════════════════════════════════════════════════════════════════════
    // GUARANTEED WIN / LOSS SHORTCUTS (any phase)
    // ════════════════════════════════════════════════════════════════════════
    const remainingPrizePool = 182 - botScore - humanScore - currentPrizeValue;

    // Victory already locked: lead exceeds everything still available
    if (leadGap > remainingPrizePool + currentPrizeValue && botScore > humanScore) {
      return lowest;
    }
    // Mathematical loss: opponent already past winning threshold
    if (humanScore > 91) {
      return lowest;
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 4: LOCKDOWN (Rounds 11–13)
    // Pure card enumeration. Bot knows almost all remaining cards exactly.
    // ════════════════════════════════════════════════════════════════════════
    if (phase === "LOCKDOWN") {
      return this._lockdownPlay(
        input,
        asc,
        currentPrizeValue,
        remainingPrizePool,
        roundNumber,
        roundsRemaining,
        leadGap,
        dominance,
        predictedHumanBid,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACCUMULATED TIE POT EMERGENCY (any mid-game phase)
    // If a large pot has built up from consecutive ties, it takes priority
    // ════════════════════════════════════════════════════════════════════════
    if (currentPrizeValue >= 12) {
      return this._contestLargePot(asc, predictedHumanBid, dominance, confidence);
    }

    // ════════════════════════════════════════════════════════════════════════
    // BLEED AND SWEEP — Phase 2 (active tie accumulation)
    // ════════════════════════════════════════════════════════════════════════
    if (this.inBleedPhase2) {
      const sweep = this._bleedPhase2(
        asc,
        highest,
        currentPrizeValue,
        predictedHumanBid,
        confidence,
        roundNumber,
        roundsRemaining,
      );
      if (sweep) return sweep;
    }

    // ════════════════════════════════════════════════════════════════════════
    // BLEED AND SWEEP — Phase 1 (sacrifice to drain human's high card)
    // Trigger: high-value prize appears, human still holds 10+ cards
    // ════════════════════════════════════════════════════════════════════════
    if (!this.bleedExecuted) {
      const humanHasHighCard  = humanCardsRemaining.some(c => c.value >= 10);
      const botHasWeapon      = botHand.some(c => c.value >= 11);
      const notTooFarBehind   = humanScore - botScore <= 20;
      const roundIsEarlyEnough = roundNumber <= 10;

      if (
        currentPrizeValue >= 10 &&
        roundIsEarlyEnough &&
        botHasWeapon &&
        humanHasHighCard &&
        notTooFarBehind
      ) {
        this.bleedExecuted = true;
        this.bleedRound    = roundNumber;
        return lowest; // sacrifice — let human burn their high card
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASES 2 & 3: ESTABLISHMENT + EXECUTION
    // Core dominance-state branching
    // ════════════════════════════════════════════════════════════════════════
    return this._dominanceBranch(
      input,
      asc,
      lowest,
      highest,
      median,
      dominance,
      predictedHumanBid,
      confidence,
      currentPrizeValue,
      bracket,
      roundNumber,
      roundsRemaining,
      humanCardsRemaining,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DOMINANCE BRANCH — the heart of the strategy
  // Everything here is conditional on who currently has structural advantage
  // ══════════════════════════════════════════════════════════════════════════
  private _dominanceBranch(
    input: BotBrainInput,
    asc: Card[],
    lowest: Card,
    highest: Card,
    median: Card,
    dominance: DominanceState,
    predictedHumanBid: number,
    confidence: Confidence,
    currentPrizeValue: number,
    bracket: Bracket,
    roundNumber: number,
    roundsRemaining: number,
    humanCardsRemaining: Card[],
  ): Card {

    switch (dominance) {

      // ── STRONG DISADVANTAGE ────────────────────────────────────────────────
      // Human has clearly higher card firepower. Direct contest will likely
      // fail. Focus on sacrifice baiting and tie engineering to neutralise.
      case "STRONG_DISADVANTAGE": {
        // High-value prize: always sacrifice — too expensive to contest,
        // and human will burn a high card to claim it
        if (currentPrizeValue >= 10) return lowest;

        // Mid-value prize (6–9): sacrifice to drain human's mid-high cards
        if (currentPrizeValue >= 6) {
          return this._sacrificeOrTie(asc, predictedHumanBid, confidence, lowest);
        }

        // Low-value prize (1–5): aim for a tie to build pot value cheaply
        // Bot will win the accumulated pot later when dominance flips
        if (confidence !== "LOW") {
          const tieCard = this._pickExactOrNearest(asc, predictedHumanBid);
          if (tieCard) return tieCard;
        }
        return lowest; // confidence low — just lose cheaply
      }

      // ── SLIGHT DISADVANTAGE ────────────────────────────────────────────────
      // Human has a marginal advantage. More selective — only sacrifice when
      // cost is low, contest if the prize is valuable enough to swing things.
      case "SLIGHT_DISADVANTAGE": {
        if (currentPrizeValue >= 10) return lowest; // never contest at disadvantage

        if (currentPrizeValue >= 6) {
          if (confidence !== "LOW") {
            // High confidence: try to tie engineer (drain their mid card via tie)
            const tieCard = this._pickExactOrNearest(asc, predictedHumanBid);
            if (tieCard) return tieCard;
          }
          return lowest; // low confidence: sacrifice cheaply
        }

        if (currentPrizeValue <= 3) return lowest; // not worth contesting

        // Prize value 4–5: cautious play, just below predicted bid
        const cautious = this._pickExactOrNearest(asc, predictedHumanBid - 1);
        return cautious ?? lowest;
      }

      // ── NEUTRAL ────────────────────────────────────────────────────────────
      // Most dangerous state — neither player has structural edge.
      // Do NOT engineer ties (bot cannot guarantee follow-through).
      // Play selectively above bracket midpoint. Win what's winnable cheaply.
      case "NEUTRAL": {
        if (currentPrizeValue <= 3) return lowest;

        if (currentPrizeValue <= 5) {
          // Small prize, play slightly above midpoint to cheaply contest
          const target = clamp(bracket.mid + 1, 1, 13);
          return this._pickMinimumBeating(asc, target) ?? lowest;
        }

        if (currentPrizeValue <= 9) {
          // Meaningful prize — play bracket midpoint + 1
          const target = clamp(predictedHumanBid + 1, 1, 13);
          return this._pickMinimumBeating(asc, target) ?? median;
        }

        // High-value prize in NEUTRAL — commit meaningfully
        const target = clamp(predictedHumanBid + 2, 1, 13);
        return this._pickMinimumBeating(asc, target) ?? median;
      }

      // ── SLIGHT ADVANTAGE ───────────────────────────────────────────────────
      // Bot has marginal edge. Play thin-margin wins. Preserve high cards.
      // Avoid unnecessary ties — ties only help if bot is sure to win the pot.
      case "SLIGHT_ADVANTAGE": {
        if (currentPrizeValue <= 3) return lowest; // not worth even a low card

        if (currentPrizeValue <= 6) {
          // Win cheaply without showing power
          const minWin = this._pickMinimumBeating(asc, predictedHumanBid);
          return minWin ?? lowest;
        }

        // Mid-to-high prize: win with minimum margin, avoid tie risk
        const minWinPlusOne = this._pickMinimumBeating(asc, predictedHumanBid + 1);
        if (minWinPlusOne) return minWinPlusOne;

        const minWin = this._pickMinimumBeating(asc, predictedHumanBid);
        return minWin ?? lowest;
      }

      // ── STRONG ADVANTAGE ───────────────────────────────────────────────────
      // Bot has clear structural superiority. Play to win but don't waste
      // power. Ties are acceptable on low prizes (pot grows, bot wins it).
      // On high prizes, win decisively with minimum necessary card.
      case "STRONG_ADVANTAGE": {
        if (currentPrizeValue <= 3) {
          // Ties on cheap prizes are fine — they build pot for bot to win later
          // Match predicted bid to engineer tie, or just play low
          const tieCard = this._pickExactOrNearest(asc, predictedHumanBid);
          return tieCard ?? lowest;
        }

        if (currentPrizeValue <= 6) {
          // Win cheaply — play minimum winning card
          const minWin = this._pickMinimumBeating(asc, predictedHumanBid);
          return minWin ?? median;
        }

        // High-value prize: win decisively with minimum required
        const minWin = this._pickMinimumBeating(asc, predictedHumanBid + 1);
        if (minWin) return minWin;
        const fallback = this._pickMinimumBeating(asc, predictedHumanBid);
        return fallback ?? highest; // if nothing beats prediction, all-in
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOCKDOWN PLAY (Rounds 11–13)
  // Bot knows exactly which cards human still holds. Pure enumeration.
  // ══════════════════════════════════════════════════════════════════════════
  private _lockdownPlay(
    input: BotBrainInput,
    asc: Card[],
    currentPrizeValue: number,
    remainingPrizePool: number,
    roundNumber: number,
    roundsRemaining: number,
    leadGap: number,
    dominance: DominanceState,
    predictedHumanBid: number,
  ): Card {
    const { botHand, humanCardsRemaining } = input;
    const lowest  = asc[0];
    const highest = asc[asc.length - 1];

    // Rule E3: Large accumulated pot — absolute priority
    if (currentPrizeValue >= 10) {
      return highest;
    }

    // Rule E2: Score gap drives last 2 rounds
    if (roundNumber >= 12) {
      if (leadGap > 0) {
        // Bot is ahead — win this round with minimum card, hold highest for last
        const minWin = this._pickMinimumBeating(asc, predictedHumanBid);
        return minWin ?? lowest;
      } else {
        // Bot is behind — must win this high-value round
        return highest;
      }
    }

    // Rule E1: Never tie in round 13 (tie loses the prize completely)
    // Handled by playing +1 above prediction in last round
    if (roundNumber === 13) {
      const antiTie = this._pickMinimumBeating(asc, predictedHumanBid + 1);
      return antiTie ?? highest;
    }

    // Full enumeration for rounds 10–11:
    // For each bot card, compute expected value against all possible human plays,
    // weighted by which human cards are more likely given their behavioral pattern
    if (humanCardsRemaining.length === 0) return lowest;

    let bestCard  = asc[0];
    let bestScore = -Infinity;
    const humanSorted = sorted(humanCardsRemaining);

    for (const botCard of asc) {
      let weightedScore = 0;
      let totalWeight = 0;

      for (const humanCard of humanSorted) {
        // Weight: is this card likely given human's bracket behavior?
        const bracket = getPrizeBracket(currentPrizeValue);
        const inBracket = humanCard.value >= bracket.low && humanCard.value <= bracket.high;
        const weight = inBracket ? 1.5 : 0.7;

        const wins = botCard.value > humanCard.value ? currentPrizeValue : 0;
        weightedScore += wins * weight;
        totalWeight   += weight;
      }

      const expectedWin = totalWeight > 0 ? weightedScore / totalWeight : 0;

      // Subtract opportunity cost of spending this card now
      const futurePrizeAvg = remainingPrizePool / Math.max(roundsRemaining, 1);
      const ocMultiplier   = botCard.value <= 5 ? 0.2 : botCard.value <= 9 ? 0.5 : 1.1;
      const opportunityCost = ocMultiplier * futurePrizeAvg * 0.4;

      const net = expectedWin - opportunityCost;
      if (net > bestScore) {
        bestScore = net;
        bestCard  = botCard;
      }
    }

    return bestCard;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLEED PHASE 2 — Tie accumulation and sweep
  // ══════════════════════════════════════════════════════════════════════════
  private _bleedPhase2(
    asc: Card[],
    highest: Card,
    currentPrizeValue: number,
    predictedHumanBid: number,
    confidence: Confidence,
    roundNumber: number,
    roundsRemaining: number,
  ): Card | null {
    // Hard abort: too late, just sweep
    if (roundNumber >= 12) {
      this.inBleedPhase2 = false;
      return highest;
    }

    // Sweep trigger: pot is large enough OR time is running out
    if (this.tieChainPotValue >= 15 || roundsRemaining <= 2) {
      this.inBleedPhase2 = false;
      return highest;
    }

    // Accumulate: only engineer ties on cheap prizes with decent confidence
    if (currentPrizeValue <= 7 && confidence !== "LOW" && roundsRemaining >= 3) {
      const tieCard =
        this._pickExactOrNearest(asc, predictedHumanBid);
      if (tieCard) return tieCard;
    }

    // Conditions not right — exit phase 2
    this.inBleedPhase2 = false;
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONTEST LARGE POT (prize >= 12)
  // ══════════════════════════════════════════════════════════════════════════
  private _contestLargePot(
    asc: Card[],
    predictedHumanBid: number,
    dominance: DominanceState,
    confidence: Confidence,
  ): Card {
    const highest = asc[asc.length - 1];
    const median  = asc[Math.floor(asc.length / 2)];

    // At disadvantage: still contest large pots — this is a comeback opportunity
    if (
      dominance === "STRONG_DISADVANTAGE" ||
      dominance === "SLIGHT_DISADVANTAGE"
    ) {
      // Try to find a minimum winning card
      const minWin = this._pickMinimumBeating(asc, predictedHumanBid);
      return minWin ?? highest; // if nothing can beat prediction, all-in
    }

    // At advantage or neutral: win with minimum card needed
    if (confidence !== "LOW") {
      const minWin = this._pickMinimumBeating(asc, predictedHumanBid);
      if (minWin) return minWin;
    }

    // Fallback: don't go below median for a pot this large
    return highest.value >= median.value ? highest : median;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SACRIFICE OR TIE helper (used in disadvantage branch)
  // Decides whether to sacrifice (play lowest) or tie-engineer
  // based on model confidence
  // ══════════════════════════════════════════════════════════════════════════
  private _sacrificeOrTie(
    asc: Card[],
    predictedHumanBid: number,
    confidence: Confidence,
    lowest: Card,
  ): Card {
    // Only attempt tie engineering with meaningful confidence
    if (confidence === "HIGH") {
      const tieCard = this._pickExactOrNearest(asc, predictedHumanBid);
      if (tieCard) return tieCard;
    }
    // Otherwise sacrifice — lose cheaply, preserve high cards
    return lowest;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DOMINANCE STATE ENGINE
  // Computes who holds structural card advantage based on:
  // 1. Highest cards played (revealed firepower)
  // 2. Score gap
  // 3. Remaining hand ceiling (hidden firepower)
  // ══════════════════════════════════════════════════════════════════════════
  private _getDominanceState(
    leadGap: number,
    botRemainingMax: number,
    humanRemainingMax: number,
    roundNumber: number,
  ): DominanceState {
    // Before calibration completes, default to NEUTRAL
    if (roundNumber < 4) return "NEUTRAL";

    // Card power comparison (most important signal)
    const playedDiff = this.botHighestPlayedCard - this.humanHighestPlayedCard;
    // Remaining hand comparison (latent power)
    const remainDiff = botRemainingMax - humanRemainingMax;

    // Combine: played history reveals past commitment,
    // remaining max reveals future threat
    const compositeScore = playedDiff * 0.6 + remainDiff * 0.4 + leadGap * 0.2;

    if (compositeScore >=  4) return "STRONG_ADVANTAGE";
    if (compositeScore >=  1) return "SLIGHT_ADVANTAGE";
    if (compositeScore >= -1) return "NEUTRAL";
    if (compositeScore >= -4) return "SLIGHT_DISADVANTAGE";
    return "STRONG_DISADVANTAGE";
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIZE BRACKET PREDICTION
  // Combines bracket map with observed offset to predict the human's likely bid
  // ══════════════════════════════════════════════════════════════════════════
  private _predictHumanBid(
    bracket: Bracket,
    humanCardsRemaining: Card[],
    roundNumber: number,
  ): { predictedHumanBid: number; confidence: Confidence } {

    const n = this.history.length;

    // Confidence improves with rounds played and offset consistency
    let confidence: Confidence;
    if (n < 3) {
      confidence = "LOW";
    } else if (n < 6) {
      confidence = "MEDIUM";
    } else {
      // Check how stable the offset has been
      const recentDeviations = this.history.slice(-3).map(r => {
        const b = getPrizeBracket(r.prizeValue);
        return Math.abs((r.humanBid - b.mid) - this.bracketOffset);
      });
      const avgDeviation = recentDeviations.reduce((s, d) => s + d, 0) / 3;
      confidence = avgDeviation < 2.5 ? "HIGH" : "MEDIUM";
    }

    // Base prediction: bracket midpoint + learned offset
    // If global priors available and early in game (low n), blend in population data
    let sessionPredicted = clamp(
      Math.round(bracket.mid + this.bracketOffset),
      bracket.low,
      bracket.high,
    );
    let predicted = sessionPredicted;
    if (this.globalPrizeBracketBehaviors && n < 4) {
      // Find matching bucket key
      const prizeVal = bracket.mid; // use midpoint as bucket proxy
      const bucketKey = prizeVal <= 3 ? "1-3" : prizeVal <= 5 ? "4-5" : prizeVal <= 9 ? "6-9" : prizeVal <= 12 ? "10-12" : "13";
      const pb = this.globalPrizeBracketBehaviors[bucketKey];
      if (pb) {
        // 40% priors, 60% session (as per spec)
        predicted = clamp(Math.round(sessionPredicted * 0.6 + pb.mean * 0.4), bracket.low, bracket.high);
      }
    }

    // Refine: filter to cards human actually still holds near the prediction
    if (humanCardsRemaining.length > 0) {
      const nearbyHumanCards = humanCardsRemaining
        .filter(c => c.value >= predicted - 2 && c.value <= predicted + 2);
      if (nearbyHumanCards.length > 0) {
        // Human is more likely to play a card they actually still hold
        const nearbyAvg = nearbyHumanCards.reduce((s, c) => s + c.value, 0)
          / nearbyHumanCards.length;
        // Blend bracket prediction with available-card reality
        predicted = Math.round(predicted * 0.6 + nearbyAvg * 0.4);
      } else {
        // No cards near prediction — human must play outside bracket
        confidence = confidence === "HIGH" ? "MEDIUM" : "LOW";
      }
    }

    return { predictedHumanBid: clamp(predicted, 1, 13), confidence };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE GOVERNOR
  // ══════════════════════════════════════════════════════════════════════════
  private _getPhase(roundNumber: number): GamePhase {
    if (roundNumber <= 3)  return "CALIBRATION";
    if (roundNumber <= 6)  return "ESTABLISHMENT";
    if (roundNumber <= 10) return "EXECUTION";
    return "LOCKDOWN";
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CARD SELECTION UTILITIES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Find the lowest card in hand that strictly beats targetValue.
   * Returns null if no card can beat target.
   */
  private _pickMinimumBeating(asc: Card[], targetValue: number): Card | null {
    return asc.find(c => c.value > targetValue) ?? null;
  }

  /**
   * Find the card in hand closest to targetValue (for tie engineering).
   * Prefers exact match, then nearest.
   */
  private _pickExactOrNearest(asc: Card[], targetValue: number): Card | null {
    if (asc.length === 0) return null;
    const exact = asc.find(c => c.value === targetValue);
    if (exact) return exact;
    return asc.reduce((best, c) =>
      Math.abs(c.value - targetValue) < Math.abs(best.value - targetValue) ? c : best
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ML METHODS — instrumentation and cross-game learning
  // ══════════════════════════════════════════════════════════════════════════

  private classifyStrategy(): StrategyLabel {
    const n = this.history.length;
    if (n === 0) return "CHAOTIC";

    const tieCount = this.history.filter(r => r.result === "tie").length;
    const tieFreq = tieCount / n;
    const sacrificeFreq = n > 0 ? this.mlSacrificeCount / n : 0;
    const highCardFreq = n > 0 ? this.mlHighCardRounds.length / n : 0;

    // AGGRESSOR: plays high cards often, low sacrifice rate
    if (highCardFreq >= 0.4 && sacrificeFreq < 0.15) return "AGGRESSOR";
    // CONSERVATIONIST: low bids, high sacrifice rate
    if (sacrificeFreq >= 0.3 && this.bracketOffset < -1.5) return "CONSERVATIONIST";
    // CALCULATOR: low ties, low bracket offset variance, consistent bids
    if (tieFreq < 0.1 && Math.abs(this.bracketOffset) < 1.0 && highCardFreq < 0.3) return "CALCULATOR";
    // REACTIVE: high tie frequency, tries to match opponent
    if (tieFreq >= 0.25) return "REACTIVE";
    // ADAPTIVE: moderate everything — hard to pin down
    if (Math.abs(this.bracketOffset) >= 1.0 && Math.abs(this.bracketOffset) < 3.0 && sacrificeFreq < 0.2) return "ADAPTIVE";
    return "CHAOTIC";
  }

  exportGameRecord(
    playerId: string,
    outcome: GameOutcome,
    finalBotScore: number,
    finalPlayerScore: number,
  ): GameRecord {
    const n = this.history.length;
    const tieCount = this.history.filter(r => r.result === "tie").length;
    const tieFrequency = n > 0 ? tieCount / n : 0;
    const avgBidToPrizeRatio = n > 0
      ? this.history.reduce((s, r) => s + (r.prizeValue > 0 ? r.humanBid / r.prizeValue : 0), 0) / n
      : 0;
    const sacrificeFrequency = n > 0 ? this.mlSacrificeCount / n : 0;

    const dominanceResponseMatrix: DominanceResponseMatrix = {};
    for (const [key, val] of Object.entries(this.mlDominanceResponseMap)) {
      dominanceResponseMatrix[key as keyof DominanceResponseMatrix] = { ...val };
    }

    const playerProfile: PlayerProfile = {
      bracketOffset: this.bracketOffset,
      dominanceResponseMatrix,
      avgBidToPrizeRatio,
      tieFrequency,
      sacrificeFrequency,
      highCardRounds: [...this.mlHighCardRounds],
      strategyLabel: this.classifyStrategy(),
    };

    return {
      gameId: typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      playerId,
      timestamp: Date.now(),
      outcome,
      finalBotScore,
      finalPlayerScore,
      totalRounds: n,
      rounds: [...this.history],
      playerProfile,
      botVersion: BOT_VERSION,
    };
  }

  initializeWithProfile(profile: AggregatedPlayerProfile | null): void {
    if (!profile || profile.gamesPlayed < 3) return;
    this.profileLoaded = true;
    // Seed bracketOffset with 60% weight from historical average
    this.bracketOffset = profile.bracketOffset * 0.6;
    this.offsetSampleCount = Math.min(profile.gamesPlayed, 5);
    // Store prior matrices for blending
    this.priorDominanceMatrix = profile.dominanceResponseMatrix ?? {};
    this.priorHighCardDistribution = profile.highCardTimingDistribution?.length === 13
      ? [...profile.highCardTimingDistribution]
      : new Array(13).fill(0);
    // Infer strategy hypothesis from recent history
    const recent = (profile.strategyHistory ?? []).slice(-3);
    if (recent.length >= 2) {
      const counts: Record<string, number> = {};
      for (const s of recent) counts[s] = (counts[s] ?? 0) + 1;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) this.strategyHypothesis = top[0] as StrategyLabel;
    }
  }

  initializeWithGlobalPriors(priors: GlobalPriors | null): void {
    if (!priors) return;
    // Only use population offset if no player profile was loaded
    if (!this.profileLoaded) {
      this.bracketOffset = priors.populationBracketOffset;
    }
    // Store prize bracket behaviors for blended predictions
    if (priors.prizeBracketBehaviors && Object.keys(priors.prizeBracketBehaviors).length > 0) {
      this.globalPrizeBracketBehaviors = priors.prizeBracketBehaviors;
    }
  }
}
