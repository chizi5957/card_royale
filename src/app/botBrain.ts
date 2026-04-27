// Card Battle — Advanced Bot Brain (TypeScript port)
// Multi-phase adaptive strategy with opponent modeling and pattern recognition.

import type { GameRecord } from "../lib/mlTypes";
import type { AggregatedPlayerProfile, GlobalPriors } from "../lib/mlTypes";

export const BOT_VERSION = "advanced-ts-v1";

// ─────────────────────────────────────────────────────────────────────────────
// Card type (matches GameBoard.tsx)
// ─────────────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit?: string;
  value: number; // A=1 .. K=13
}

// ─────────────────────────────────────────────────────────────────────────────
// RoundResult — matches GameBoard.tsx recordRound call
// ─────────────────────────────────────────────────────────────────────────────

export interface RoundResult {
  round: number;
  prizeValue: number;
  botBid: Card;
  humanBid: Card;
  result: "human" | "bot" | "tie";
}

// ─────────────────────────────────────────────────────────────────────────────
// selectCard input — matches GameBoard.tsx selectCard call
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectCardInput {
  botHand: Card[];
  humanCardsRemaining: Card[];
  currentPrize: Card | null;
  carriedOverPrizes: Card[];
  botScore: number;
  humanScore: number;
  roundNumber: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prize Bracket Map
// ─────────────────────────────────────────────────────────────────────────────

interface Bracket { low: number; mid: number; high: number; }

const PRIZE_BRACKETS: Array<[number, number, Bracket]> = [
  [1,  3,  { low: 1,  mid: 2,  high: 4  }],
  [4,  5,  { low: 3,  mid: 5,  high: 7  }],
  [6,  9,  { low: 4,  mid: 7,  high: 11 }],
  [10, 12, { low: 8,  mid: 10, high: 13 }],
  [13, 13, { low: 11, mid: 12, high: 13 }],
];

function getBracket(prizeValue: number): Bracket {
  for (const [lo, hi, b] of PRIZE_BRACKETS) {
    if (prizeValue >= lo && prizeValue <= hi) return b;
  }
  return { low: 1, mid: 7, high: 13 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tie Chain Tracker
// ─────────────────────────────────────────────────────────────────────────────

interface TieChainState {
  active: boolean;
  consecutiveTies: number;
  potValue: number;
  botCardsSpent: number[];
  oppCardsSpent: number[];
  oppConfirmedMin: number;
}

class TieChainTracker {
  state: TieChainState = this._fresh();

  private _fresh(): TieChainState {
    return { active: false, consecutiveTies: 0, potValue: 0, botCardsSpent: [], oppCardsSpent: [], oppConfirmedMin: 0 };
  }

  reset() { this.state = this._fresh(); }

  onRoundResult(result: string, _prizeValue: number, botBid: number, oppBid: number, potValue: number) {
    if (result === "tie") {
      if (!this.state.active) {
        this.state.active = true;
        this.state.consecutiveTies = 1;
        this.state.potValue = potValue;
      } else {
        this.state.consecutiveTies++;
        this.state.potValue = potValue;
      }
      this.state.botCardsSpent.push(botBid);
      this.state.oppCardsSpent.push(oppBid);
      this.state.oppConfirmedMin = Math.max(this.state.oppConfirmedMin, oppBid);
    } else {
      this.state = this._fresh();
    }
  }

  isBotDominated(botHandMax: number): boolean {
    return this.state.active && this.state.oppConfirmedMin >= botHandMax;
  }

  computeExitDecision(botHand: number[]): [number, string, string] {
    const sorted = [...botHand].sort((a, b) => a - b);
    const exitCard = sorted[0];
    return [exitCard, "tie_chain_dominated_exit",
      `TIE CHAIN EXIT: dominated (opp confirmed >= ${this.state.oppConfirmedMin}, bot max ${Math.max(...botHand)}). Conceding with ${exitCard}.`];
  }

  shouldContinueChain(botHandMax: number, potValue: number, remainingPrizePool: number): boolean {
    const edge = botHandMax > this.state.oppConfirmedMin;
    const worth = potValue >= 0.25 * remainingPrizePool;
    return edge && worth;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Opponent Model
// ─────────────────────────────────────────────────────────────────────────────

const enum StrategyArchetype { AGGRESSOR, CONSERVATIONIST, REACTIVE, CALCULATOR, CHAOTIC, ADAPTIVE }

class OpponentModel {
  bidByBucket: Record<string, number[]> = {};
  bidByExactPrize: Record<number, number[]> = {};
  responseToBotBid: Record<number, number[]> = {};
  postLossBids: number[] = [];
  postWinBids: number[] = [];
  highCardsUsed: Set<number> = new Set();
  allPlayed: number[] = [];
  bracketOffset = 0;
  offsetWeight = 0;
  archetype: StrategyArchetype = StrategyArchetype.CHAOTIC;
  archetypeConfidence = 0;
  isCounteringBot = false;
  counterEvidence = 0;

  record(prizeValue: number, opponentBid: number, botBid: number, lastResult: string | null) {
    const br = getBracket(prizeValue);
    const key = `${br.low}-${br.high}`;
    const deviation = opponentBid - br.mid;

    if (!this.bidByBucket[key]) this.bidByBucket[key] = [];
    this.bidByBucket[key].push(opponentBid);
    if (!this.bidByExactPrize[prizeValue]) this.bidByExactPrize[prizeValue] = [];
    this.bidByExactPrize[prizeValue].push(opponentBid);
    if (!this.responseToBotBid[botBid]) this.responseToBotBid[botBid] = [];
    this.responseToBotBid[botBid].push(opponentBid);
    this.allPlayed.push(opponentBid);
    if (opponentBid >= 10) this.highCardsUsed.add(opponentBid);

    if (lastResult === "opponent") this.postWinBids.push(opponentBid);
    else if (lastResult === "bot") this.postLossBids.push(opponentBid);

    const rw = 1.0 + this.allPlayed.length / 13.0;
    this.bracketOffset = (this.bracketOffset * this.offsetWeight + deviation * rw) / (this.offsetWeight + rw);
    this.offsetWeight += rw;

    const recent = this.allPlayed.slice(-3);
    if (recent.length >= 3) {
      const botKeys = Object.keys(this.responseToBotBid).map(Number).slice(-3);
      if (botKeys.length > 0) {
        const avgBot = botKeys.reduce((s, v) => s + v, 0) / botKeys.length;
        const avgOpp = recent.reduce((s, v) => s + v, 0) / recent.length;
        if (avgOpp - avgBot >= 1.0 && avgOpp - avgBot <= 2.5) this.counterEvidence++;
        else this.counterEvidence = Math.max(0, this.counterEvidence - 1);
      }
      this.isCounteringBot = this.counterEvidence >= 3;
    }

    this._classify();
  }

  private _classify() {
    const n = this.allPlayed.length;
    if (n < 3) { this.archetype = StrategyArchetype.CHAOTIC; this.archetypeConfidence = 0; return; }
    const consistency = this._offsetConsistency();
    if (this.bracketOffset > 2.0 && consistency > 0.6) {
      this.archetype = StrategyArchetype.AGGRESSOR; this.archetypeConfidence = Math.min(consistency, 0.95);
    } else if (this.bracketOffset < -2.0 && consistency > 0.6) {
      this.archetype = StrategyArchetype.CONSERVATIONIST; this.archetypeConfidence = Math.min(consistency, 0.95);
    } else if (this._reactiveScore() > 0.5) {
      this.archetype = StrategyArchetype.REACTIVE; this.archetypeConfidence = this._reactiveScore();
    } else if (consistency > 0.7) {
      this.archetype = StrategyArchetype.CALCULATOR; this.archetypeConfidence = consistency;
    } else if (consistency < 0.3) {
      this.archetype = StrategyArchetype.CHAOTIC; this.archetypeConfidence = 0.4;
    } else {
      this.archetype = StrategyArchetype.ADAPTIVE; this.archetypeConfidence = 0.5;
    }
  }

  private _offsetConsistency(): number {
    if (this.allPlayed.length < 3) return 0;
    const offsets: number[] = [];
    for (const [pv, bids] of Object.entries(this.bidByExactPrize)) {
      const br = getBracket(Number(pv));
      for (const b of bids) offsets.push(b - br.mid);
    }
    if (!offsets.length) return 0;
    const mean = offsets.reduce((s, v) => s + v, 0) / offsets.length;
    const variance = offsets.reduce((s, v) => s + (v - mean) ** 2, 0) / offsets.length;
    return Math.max(0, 1 - variance / 25);
  }

  private _reactiveScore(): number {
    const pairs: boolean[] = [];
    for (const [bBid, oppBids] of Object.entries(this.responseToBotBid)) {
      for (const ob of oppBids) pairs.push(Math.abs(ob - Number(bBid)) <= 2);
    }
    if (!pairs.length) return 0;
    return pairs.filter(Boolean).length / pairs.length;
  }

  predictBid(prizeValue: number, lastBotBid: number | null, remainingCards: number[]): [number, number] {
    const br = getBracket(prizeValue);
    const key = `${br.low}-${br.high}`;
    const exactBids = this.bidByExactPrize[prizeValue] ?? [];
    const bucketBids = this.bidByBucket[key] ?? [];

    const weightedAvg = (bids: number[]) => {
      if (!bids.length) return br.mid;
      const weights = bids.map((_, i) => 1 + i * 0.3);
      const tw = weights.reduce((s, w) => s + w, 0);
      return bids.reduce((s, b, i) => s + b * weights[i], 0) / tw;
    };

    let base: number;
    if (exactBids.length && bucketBids.length) base = (weightedAvg(exactBids) * 2 + weightedAvg(bucketBids)) / 3;
    else if (exactBids.length) base = weightedAvg(exactBids);
    else if (bucketBids.length) base = weightedAvg(bucketBids);
    else base = br.mid + this.bracketOffset;

    if (this.archetype === StrategyArchetype.REACTIVE && lastBotBid !== null) {
      const reactivePred = lastBotBid + this.bracketOffset * 0.5;
      base = base * 0.4 + reactivePred * 0.6;
    }

    if (this.postLossBids.length >= 2) {
      const recent3 = this.postLossBids.slice(-3);
      const avgPostLoss = recent3.reduce((s, v) => s + v, 0) / recent3.length;
      const avgNormal = this.allPlayed.reduce((s, v) => s + v, 0) / this.allPlayed.length;
      const escalation = Math.max(0, avgPostLoss - avgNormal);
      base += escalation * 0.5;
    }

    let predicted = Math.round(base);
    predicted = Math.max(1, Math.min(13, predicted));
    if (remainingCards.length && !remainingCards.includes(predicted)) {
      predicted = remainingCards.reduce((best, c) => Math.abs(c - predicted) < Math.abs(best - predicted) ? c : best, remainingCards[0]);
    }

    const nEvidence = exactBids.length * 2 + bucketBids.length;
    let rawConfidence = Math.min(0.9, nEvidence / 12);
    if (this.isCounteringBot) rawConfidence *= 0.6;

    return [predicted, rawConfidence];
  }

  get opponentHasKing(): boolean { return !this.highCardsUsed.has(13); }
  get opponentHasQueen(): boolean { return !this.highCardsUsed.has(12); }

  remainingEstimate(allCards: number[]): number[] {
    const played = [...this.allPlayed];
    const estimate: number[] = [];
    for (const c of allCards) {
      const idx = played.indexOf(c);
      if (idx !== -1) played.splice(idx, 1);
      else estimate.push(c);
    }
    return estimate;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy helpers
// ─────────────────────────────────────────────────────────────────────────────

function pickNearest(hand: number[], target: number): number {
  return hand.reduce((best, c) => Math.abs(c - target) < Math.abs(best - target) ? c : best, hand[0]);
}

function pickMinimumBeating(hand: number[], target: number): number | null {
  const beaters = hand.filter(c => c > target);
  return beaters.length ? Math.min(...beaters) : null;
}

function pickExactOrNearest(hand: number[], target: number): number {
  return hand.includes(target) ? target : pickNearest(hand, target);
}

function strategySacrifice(hand: number[], _prizeValue: number, reason: string): [number, string, string] {
  return [Math.min(...hand), "sacrifice", `Sacrificing on prize. Reason: ${reason}`];
}

function strategyCalibration(hand: number[], prizeValue: number, roundNumber: number): [number, string, string] {
  const br = getBracket(prizeValue);
  if (prizeValue >= 12) {
    const card = pickExactOrNearest(hand, 9);
    return [card, "calibration_high_prize", `Prize ${prizeValue} too valuable. Bidding near 9.`];
  }
  const target = Math.max(1, br.mid - 1);
  const card = pickExactOrNearest(hand, target);
  return [card, "calibration_probe", `Round ${roundNumber} calibration probe on prize ${prizeValue}.`];
}

function strategyBleed(hand: number[], prizeValue: number, opp: OpponentModel): [number, string, string] {
  const likelyOverbid = opp.archetype === StrategyArchetype.AGGRESSOR
    || opp.archetype === StrategyArchetype.CALCULATOR
    || opp.bracketOffset > 1.5;
  if (!likelyOverbid) return [0, "bleed_aborted", `Bleed aborted: opponent unlikely to commit high card.`];
  return [Math.min(...hand), "bleed", `Bleed on prize ${prizeValue}.`];
}

function strategyThinMarginWin(hand: number[], prizeValue: number, predicted: number, confidence: number): [number, string, string] {
  const margin = confidence >= 0.75 ? 1 : confidence >= 0.5 ? 2 : 3;
  const target = Math.min(predicted + margin, 13);
  let winner = pickMinimumBeating(hand, target - 1);
  if (winner === null) winner = pickMinimumBeating(hand, predicted);
  if (winner === null) return strategySacrifice(hand, prizeValue, "cannot beat prediction");
  return [winner, "thin_margin_win", `Winning prize ${prizeValue} with thin margin. Predicted: ${predicted}, playing ${winner}.`];
}

function strategyEndgame(
  hand: number[], opponentRemaining: number[], prizeValue: number, potValue: number,
  botScore: number, opponentScore: number, roundsLeft: number, opp: OpponentModel
): [number, string, string] {
  if (potValue >= 12 || prizeValue >= 10) {
    return [Math.max(...hand), "endgame_all_in", `Large pot/prize. All-in.`];
  }
  const botHasKing = hand.includes(13);
  const botHasQueen = hand.includes(12);
  if (botHasKing && !opp.opponentHasKing && roundsLeft > 1 && prizeValue >= 8 && botHasQueen) {
    return [12, "tie_break_advantage", `Tie-break advantage. Playing Q to save K.`];
  }
  const lead = botScore - opponentScore;
  if (lead > 0 && opponentRemaining.length > 0) {
    const oppMax = Math.max(...opponentRemaining);
    const winner = pickMinimumBeating(hand, oppMax);
    if (winner !== null) return [winner, "endgame_protect_lead", `Protecting lead. Playing ${winner}.`];
  }
  return [Math.max(...hand), "endgame_contest", `Contesting in endgame.`];
}

// ─────────────────────────────────────────────────────────────────────────────
// Anti-Exploit Layer
// ─────────────────────────────────────────────────────────────────────────────

class AntiExploitLayer {
  roundsSincePatternBreak = 0;
  consecutiveSameTactic = 0;
  lastTactic = "";

  apply(chosen: number, hand: number[], tactic: string, opponentCountering: boolean): [number, boolean] {
    this.roundsSincePatternBreak++;
    if (tactic === this.lastTactic) this.consecutiveSameTactic++;
    else this.consecutiveSameTactic = 0;
    this.lastTactic = tactic;

    const shouldBreak = this.consecutiveSameTactic >= 4 || this.roundsSincePatternBreak >= 5 || opponentCountering;
    if (shouldBreak) {
      this.roundsSincePatternBreak = 0;
      this.consecutiveSameTactic = 0;
      const surprise = Math.random() < 0.5 ? Math.max(...hand) : Math.min(...hand);
      if (surprise !== chosen) return [surprise, true];
    }

    const roll = Math.random();
    if (roll < 0.70) return [chosen, false];
    if (roll < 0.90) {
      const delta = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
      const nearest = pickNearest(hand, chosen + delta);
      if (Math.abs(nearest - chosen) <= 3) return [nearest, nearest !== chosen];
      return [chosen, false];
    }
    const surprise = chosen === Math.max(...hand) ? Math.min(...hand) : Math.max(...hand);
    return [surprise, true];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dominance computation
// ─────────────────────────────────────────────────────────────────────────────

type DominanceState = "STRONG_ADVANTAGE" | "SLIGHT_ADVANTAGE" | "NEUTRAL" | "SLIGHT_DISADVANTAGE" | "STRONG_DISADVANTAGE";

function computeDominance(botHighestPlayed: number, oppHighestPlayed: number, botHandMax: number, oppHandMaxEst: number, leadGap: number): DominanceState {
  const composite = (botHighestPlayed - oppHighestPlayed) * 0.6 + (botHandMax - oppHandMaxEst) * 0.4 + leadGap * 0.2;
  if (composite >= 4) return "STRONG_ADVANTAGE";
  if (composite >= 1) return "SLIGHT_ADVANTAGE";
  if (composite >= -1) return "NEUTRAL";
  if (composite >= -4) return "SLIGHT_DISADVANTAGE";
  return "STRONG_DISADVANTAGE";
}

// ─────────────────────────────────────────────────────────────────────────────
// Round record — exported so mlTypes.ts can import it
// ─────────────────────────────────────────────────────────────────────────────

export interface RoundRecord {
  roundNumber: number;
  prizeValue: number;
  botBid: number;
  humanBid: number;
  result: "human" | "bot" | "tie";
  potValue: number;
  tacticUsed: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main BotBrain class
// ─────────────────────────────────────────────────────────────────────────────

export class BotBrain {
  private static readonly ALL_CARDS = Array.from({ length: 13 }, (_, i) => i + 1);
  private static readonly RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  private opponentModel = new OpponentModel();
  private antiExploit = new AntiExploitLayer();
  private tieChain = new TieChainTracker();
  private history: RoundRecord[] = [];
  private botHighestPlayed = 0;
  private oppHighestPlayed = 0;
  private bleedExecuted = false;
  private bleedRound: number | null = null;
  private bleedSuccessful = false;

  // ML instrumentation fields
  private mlBracketOffsets: number[] = [];
  private mlStrategyLabels: string[] = [];
  private mlHighCardRounds = 0;
  private mlSacrificeCount = 0;
  private globalPriors: GlobalPriors | null = null;
  private playerProfile: AggregatedPlayerProfile | null = null;

  reset() {
    this.opponentModel = new OpponentModel();
    this.antiExploit = new AntiExploitLayer();
    this.tieChain = new TieChainTracker();
    this.history = [];
    this.botHighestPlayed = 0;
    this.oppHighestPlayed = 0;
    this.bleedExecuted = false;
    this.bleedRound = null;
    this.bleedSuccessful = false;
    this.mlBracketOffsets = [];
    this.mlStrategyLabels = [];
    this.mlHighCardRounds = 0;
    this.mlSacrificeCount = 0;
  }

  initializeWithProfile(profile: AggregatedPlayerProfile) {
    this.playerProfile = profile;
    if (profile.bracketOffset !== undefined) {
      this.opponentModel.bracketOffset = profile.bracketOffset;
      this.opponentModel.offsetWeight = 2;
    }
  }

  initializeWithGlobalPriors(priors: GlobalPriors) {
    this.globalPriors = priors;
  }

  // Convert value to Card object
  private makeCard(value: number): Card {
    return { rank: BotBrain.RANKS[value - 1], value };
  }

  // ── Public selectCard ────────────────────────────────────────────────────

  selectCard(input: SelectCardInput): Card {
    const { botHand, humanCardsRemaining, currentPrize, carriedOverPrizes, botScore, humanScore, roundNumber } = input;
    if (!botHand.length) throw new Error("Bot has no cards remaining.");

    const prizeValue = currentPrize?.value ?? 1;
    const carriedTotal = carriedOverPrizes.reduce((s, c) => s + c.value, 0);
    const pot = carriedTotal + prizeValue;

    const hand = botHand.map(c => c.value).sort((a, b) => a - b);
    const oppRemaining = humanCardsRemaining.map(c => c.value);
    const phase = this._getPhase(roundNumber);
    const dominance = this._getDominance(hand, botScore, humanScore);

    const lastBotBid = this.history.length > 0 ? this.history[this.history.length - 1].botBid : null;
    const [prediction, confidence] = this.opponentModel.predictBid(prizeValue, lastBotBid, oppRemaining);

    // ── Tie chain dominated exit ──────────────────────────────────────────
    if (this.tieChain.state.active && this.tieChain.isBotDominated(Math.max(...hand))) {
      const [card, tactic, reasoning] = this.tieChain.computeExitDecision(hand);
      return this._finalize(card, tactic, hand, false);
    }

    // ── Tie chain continue/exit check ─────────────────────────────────────
    if (this.tieChain.state.active && !this.tieChain.isBotDominated(Math.max(...hand))) {
      const remaining = Math.max(1, 91 - botScore - humanScore);
      if (!this.tieChain.shouldContinueChain(Math.max(...hand), this.tieChain.state.potValue, remaining)) {
        return this._finalize(Math.min(...hand), "tie_chain_not_worth_it", hand, false);
      }
    }

    // ── Endgame override ──────────────────────────────────────────────────
    if (phase === "LOCKDOWN" || roundNumber >= 11) {
      const [card, tactic] = strategyEndgame(hand, oppRemaining, prizeValue, pot, botScore, humanScore, 13 - roundNumber, this.opponentModel);
      return this._finalize(card, tactic, hand, tactic !== "tie_chain_dominated_exit");
    }

    // ── Victory/loss shortcuts ────────────────────────────────────────────
    const remainingPrizes = 91 - botScore - humanScore;
    const lead = botScore - humanScore;
    if (lead > remainingPrizes + pot) {
      const [card, tactic] = strategySacrifice(hand, prizeValue, "victory locked");
      return this._finalize(card, tactic, hand, false);
    }
    if (humanScore > 45) {
      const [card, tactic] = strategySacrifice(hand, prizeValue, "mathematical loss");
      return this._finalize(card, tactic, hand, false);
    }

    // ── Large pot ─────────────────────────────────────────────────────────
    if (pot >= 12) {
      const winner = pickMinimumBeating(hand, prediction);
      const card = winner ?? Math.max(...hand);
      return this._finalize(card, "large_pot_contest", hand, true);
    }

    // ── Calibration phase ─────────────────────────────────────────────────
    if (phase === "CALIBRATION") {
      const [card, tactic] = strategyCalibration(hand, prizeValue, roundNumber);
      return this._finalize(card, tactic, hand, true);
    }

    // ── Bleed strategy ────────────────────────────────────────────────────
    if (!this.bleedExecuted && prizeValue >= 10 && roundNumber <= 10
        && hand.some(c => c >= 11) && this.opponentModel.opponentHasKing) {
      const [card, tactic] = strategyBleed(hand, prizeValue, this.opponentModel);
      if (tactic === "bleed") {
        this.bleedExecuted = true;
        this.bleedRound = roundNumber;
        return this._finalize(card, tactic, hand, false);
      }
    }

    // ── Dominance branch ──────────────────────────────────────────────────
    const [card, tactic] = this._dominanceBranch(hand, prizeValue, dominance, prediction, confidence, pot);
    return this._finalize(card, tactic, hand, true);
  }

  // ── Public recordRound ───────────────────────────────────────────────────

  recordRound(r: RoundResult) {
    const prizeValue = r.prizeValue;
    const botBid = r.botBid.value;
    const humanBid = r.humanBid.value;
    const result = r.result; // "human" | "bot" | "tie"
    // Map to internal result: "bot" means bot won
    const internalResult = result; // same naming works for our internal use

    this.opponentModel.record(
      prizeValue,
      humanBid,
      botBid,
      this.history.length > 0 ? this.history[this.history.length - 1].result : null
    );

    this.botHighestPlayed = Math.max(this.botHighestPlayed, botBid);
    this.oppHighestPlayed = Math.max(this.oppHighestPlayed, humanBid);

    // Tie chain: map result to "tie" or not
    const tcResult = result === "tie" ? "tie" : "not_tie";
    this.tieChain.onRoundResult(
      tcResult,
      prizeValue,
      botBid,
      humanBid,
      prizeValue // pot value approximation; carried prizes handled in selectCard
    );

    if (this.bleedExecuted && this.bleedRound === r.round && !this.bleedSuccessful) {
      this.bleedSuccessful = humanBid >= 10;
    }

    // ML tracking
    const br = getBracket(prizeValue);
    this.mlBracketOffsets.push(humanBid - br.mid);
    if (humanBid >= 10) this.mlHighCardRounds++;
    if (result === "bot" && botBid <= 3) this.mlSacrificeCount++;

    this.history.push({
      roundNumber: r.round,
      prizeValue,
      botBid,
      humanBid,
      result: result === "tie" ? "tie" : result === "bot" ? "bot" : "human",
      potValue: prizeValue,
      tacticUsed: "",
    });
  }

  // ── ML methods ───────────────────────────────────────────────────────────

  classifyStrategy(): string {
    const n = this.history.length;
    if (n < 3) return "unknown";
    const archLabel = StrategyArchetype[this.opponentModel.archetype].toLowerCase();
    if (this.mlSacrificeCount > n * 0.4) return "sacrificer";
    if (this.mlHighCardRounds > n * 0.5) return "aggressor";
    return archLabel;
  }

  exportGameRecord(
    playerId: string,
    outcome: "player_win" | "bot_win" | "tie",
    finalBotScore: number,
    finalPlayerScore: number
  ): GameRecord {
    const avgBidRatio = this.history.length > 0
      ? this.history.reduce((s, r) => s + r.opponentBid / Math.max(r.prizeValue, 1), 0) / this.history.length
      : 0.5;
    const bracketOffset = this.mlBracketOffsets.length > 0
      ? this.mlBracketOffsets.reduce((s, v) => s + v, 0) / this.mlBracketOffsets.length
      : 0;
    const tieFreq = this.history.filter(r => r.result === "tie").length / Math.max(this.history.length, 1);
    const strategyLabel = this.classifyStrategy();

    const label = (strategyLabel.toUpperCase() as import("../lib/mlTypes").StrategyLabel) || "CHAOTIC";
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
        bracketOffset,
        avgBidToPrizeRatio: avgBidRatio,
        tieFrequency: tieFreq,
        strategyLabel: label,
        sacrificeFrequency: this.mlSacrificeCount / Math.max(this.history.length, 1),
        highCardRounds: this.history.map((_, i) => i).filter(i => this.history[i].humanBid >= 10),
        dominanceResponseMatrix: {},
      },
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _getPhase(round: number): string {
    if (round <= 3) return "CALIBRATION";
    if (round <= 6) return "ESTABLISHMENT";
    if (round <= 10) return "EXECUTION";
    return "LOCKDOWN";
  }

  private _getDominance(hand: number[], botScore: number, humanScore: number): DominanceState {
    const oppRemaining = this.opponentModel.remainingEstimate(BotBrain.ALL_CARDS);
    const oppMaxEst = oppRemaining.length > 0 ? Math.max(...oppRemaining) : 0;
    const botHandMax = hand.length > 0 ? Math.max(...hand) : 0;
    return computeDominance(this.botHighestPlayed, this.oppHighestPlayed, botHandMax, oppMaxEst, botScore - humanScore);
  }

  private _dominanceBranch(
    hand: number[], prizeValue: number, dominance: DominanceState,
    prediction: number, confidence: number, pot: number
  ): [number, string] {
    if (dominance === "STRONG_DISADVANTAGE") {
      if (prizeValue >= 10) return [strategySacrifice(hand, prizeValue, "strong disadvantage")[0], "sacrifice"];
      if (prizeValue >= 6 && confidence >= 0.6) return [pickExactOrNearest(hand, prediction), "probe"];
      if (prizeValue < 6 && confidence >= 0.5) return [pickExactOrNearest(hand, prediction), "tie_engineering_disadvantage"];
      return [strategySacrifice(hand, prizeValue, "low confidence")[0], "sacrifice"];
    }
    if (dominance === "SLIGHT_DISADVANTAGE") {
      if (prizeValue >= 10) return [strategySacrifice(hand, prizeValue, "slight disadvantage")[0], "sacrifice"];
      if (prizeValue <= 3) return [strategySacrifice(hand, prizeValue, "not worth it")[0], "sacrifice"];
      if (prizeValue >= 6 && confidence >= 0.65) return [pickExactOrNearest(hand, prediction), "probe"];
      return [pickExactOrNearest(hand, Math.max(1, prediction - 1)), "cautious_underbid"];
    }
    if (dominance === "NEUTRAL") {
      if (prizeValue <= 3) return [strategySacrifice(hand, prizeValue, "neutral low prize")[0], "sacrifice"];
      if (prizeValue <= 9) return [strategyThinMarginWin(hand, prizeValue, prediction, confidence)[0], "thin_margin_win"];
      const target = Math.min(prediction + 2, 13);
      const winner = pickMinimumBeating(hand, target - 1);
      if (winner !== null) return [winner, "neutral_high_prize"];
      return [strategySacrifice(hand, prizeValue, "cannot beat prediction")[0], "sacrifice"];
    }
    if (dominance === "SLIGHT_ADVANTAGE") {
      if (prizeValue <= 3) return [strategySacrifice(hand, prizeValue, "not worth contesting")[0], "sacrifice"];
      if (prizeValue <= 9) return [strategyThinMarginWin(hand, prizeValue, prediction, confidence)[0], "thin_margin_win"];
      const w1 = pickMinimumBeating(hand, prediction + 1);
      if (w1 !== null) return [w1, "advantage_high_prize"];
      const w2 = pickMinimumBeating(hand, prediction);
      if (w2 !== null) return [w2, "advantage_tight_win"];
      return [strategySacrifice(hand, prizeValue, "cannot win at advantage")[0], "sacrifice"];
    }
    // STRONG_ADVANTAGE
    if (prizeValue <= 3) return [pickExactOrNearest(hand, prediction), "tie_engineering_advantage"];
    if (prizeValue <= 6) {
      const winner = pickMinimumBeating(hand, prediction);
      return [winner ?? pickNearest(hand, prediction), "cheap_win_strong_advantage"];
    }
    const w1 = pickMinimumBeating(hand, prediction + 1);
    if (w1 !== null) return [w1, "strong_advantage_decisive_win"];
    const w2 = pickMinimumBeating(hand, prediction);
    return [w2 ?? Math.max(...hand), "strong_advantage_fallback"];
  }

  private _finalize(value: number, _tactic: string, hand: number[], applyAntiExploit: boolean): Card {
    let finalValue = hand.includes(value) ? value : pickNearest(hand, value);
    if (applyAntiExploit && hand.length > 1) {
      const [ae] = this.antiExploit.apply(finalValue, hand, _tactic, this.opponentModel.isCounteringBot);
      if (hand.includes(ae)) finalValue = ae;
    }
    return this.makeCard(finalValue);
  }
}
