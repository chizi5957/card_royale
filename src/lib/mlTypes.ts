import type { RoundRecord } from "../app/botBrain";

export type GameOutcome = "bot_win" | "player_win" | "tie";

export type StrategyLabel =
  | "AGGRESSOR"
  | "CONSERVATIONIST"
  | "REACTIVE"
  | "CALCULATOR"
  | "CHAOTIC"
  | "ADAPTIVE";

export type DominanceKey =
  | "STRONG_ADVANTAGE"
  | "SLIGHT_ADVANTAGE"
  | "NEUTRAL"
  | "SLIGHT_DISADVANTAGE"
  | "STRONG_DISADVANTAGE";

export interface DominanceResponseEntry {
  count: number;
  humanBidSum: number;
  humanBidAbovePrediction: number;
}

export type DominanceResponseMatrix = Partial<
  Record<DominanceKey, DominanceResponseEntry>
>;

export interface PlayerProfile {
  bracketOffset: number;
  dominanceResponseMatrix: DominanceResponseMatrix;
  avgBidToPrizeRatio: number;
  tieFrequency: number;
  sacrificeFrequency: number;
  highCardRounds: number[];
  strategyLabel: StrategyLabel;
}

export interface GameRecord {
  gameId: string;
  playerId: string;
  timestamp: number;
  outcome: GameOutcome;
  finalBotScore: number;
  finalPlayerScore: number;
  totalRounds: number;
  rounds: RoundRecord[];
  playerProfile: PlayerProfile;
  botVersion: string;
}

export interface AggregatedPlayerProfile {
  playerId: string;
  gamesPlayed: number;
  winRate: number;
  bracketOffset: number;
  avgBidToPrizeRatio: number;
  tieFrequency: number;
  highCardTimingDistribution: number[];
  dominanceResponseMatrix: DominanceResponseMatrix;
  strategyHistory: StrategyLabel[];
  lastSeen: number;
  updatedAt: number;
}

export interface PrizeBracketStats {
  mean: number;
  p25: number;
  p75: number;
}

export interface GlobalPriors {
  version: number;
  computedAt: number;
  sampleSize: number;
  populationBracketOffset: number;
  strategyDistribution: Record<string, number>;
  prizeBracketBehaviors: Record<string, PrizeBracketStats>;
  exploitPatterns: string[];
}
