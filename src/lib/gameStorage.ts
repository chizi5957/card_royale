import type { GameRecord, AggregatedPlayerProfile, GlobalPriors } from "./mlTypes";

const DB_NAME = "CardBattleML";
const DB_VERSION = 1;
const SYNC_QUEUE_KEY = "cardBattle_syncQueue";
const MAX_SYNC_QUEUE = 20;

let db: IDBDatabase | null = null;

export async function init(): Promise<void> {
  if (db) return;
  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = (e.target as IDBOpenDBRequest).result;

        if (!d.objectStoreNames.contains("games")) {
          const games = d.createObjectStore("games", { keyPath: "gameId" });
          games.createIndex("byPlayerId", "playerId", { unique: false });
          games.createIndex("byTimestamp", "timestamp", { unique: false });
        }
        if (!d.objectStoreNames.contains("playerProfiles")) {
          d.createObjectStore("playerProfiles", { keyPath: "playerId" });
        }
        if (!d.objectStoreNames.contains("globalPriors")) {
          d.createObjectStore("globalPriors", { keyPath: "version" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // IndexedDB unavailable (private browsing etc.) — fail silently
    db = null;
  }
}

function txStore(
  storeName: string,
  mode: IDBTransactionMode,
): IDBObjectStore | null {
  if (!db) return null;
  try {
    return db.transaction(storeName, mode).objectStore(storeName);
  } catch {
    return null;
  }
}

function idbPut(store: IDBObjectStore, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve(); // fail silently
  });
}

function idbGet<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | null> {
  return new Promise((resolve) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function saveGameRecord(record: GameRecord): Promise<void> {
  try {
    const store = txStore("games", "readwrite");
    if (store) await idbPut(store, record);
    // Friend games are stored for history/stats, but only bot games feed
    // the opponent-model profile (they describe how you play vs the bot)
    if (!record.botVersion.startsWith("multiplayer")) {
      await updateAggregatedProfile(record);
    }
  } catch {
    // fail silently
  }
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  botGames: number;
  friendGames: number;
}

// Roll up every stored game for this player — powers the Home screen stats
export async function getPlayerStats(playerId: string): Promise<PlayerStats> {
  const empty: PlayerStats = { gamesPlayed: 0, wins: 0, losses: 0, ties: 0, botGames: 0, friendGames: 0 };
  try {
    const store = txStore("games", "readonly");
    if (!store) return empty;
    return await new Promise<PlayerStats>((resolve) => {
      const stats = { ...empty };
      const index = store.index("byPlayerId");
      const req = index.openCursor(IDBKeyRange.only(playerId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(stats); return; }
        const g = cursor.value as GameRecord;
        stats.gamesPlayed++;
        if (g.outcome === "player_win") stats.wins++;
        else if (g.outcome === "bot_win") stats.losses++;
        else stats.ties++;
        if (g.botVersion.startsWith("multiplayer")) stats.friendGames++;
        else stats.botGames++;
        cursor.continue();
      };
      req.onerror = () => resolve(stats);
    });
  } catch {
    return empty;
  }
}

export async function updateAggregatedProfile(record: GameRecord): Promise<void> {
  try {
    const store = txStore("playerProfiles", "readwrite");
    if (!store) return;

    const existing = await idbGet<AggregatedPlayerProfile>(store, record.playerId);
    const ALPHA = 0.3; // EMA weight for new data
    const KEEP = 1 - ALPHA; // 0.7

    const isWin = record.outcome === "player_win" ? 1 : 0;

    if (!existing) {
      // First game — initialise fresh
      const dist = new Array(13).fill(0);
      for (const r of record.playerProfile.highCardRounds) {
        const idx = Math.min(r - 1, 12);
        dist[idx] = 1;
      }
      // Normalise
      const total = dist.reduce((s, v) => s + v, 0);
      const normDist = total > 0 ? dist.map(v => v / total) : dist;

      const profile: AggregatedPlayerProfile = {
        playerId: record.playerId,
        gamesPlayed: 1,
        winRate: isWin,
        bracketOffset: record.playerProfile.bracketOffset,
        avgBidToPrizeRatio: record.playerProfile.avgBidToPrizeRatio,
        tieFrequency: record.playerProfile.tieFrequency,
        highCardTimingDistribution: normDist,
        dominanceResponseMatrix: record.playerProfile.dominanceResponseMatrix,
        strategyHistory: [record.playerProfile.strategyLabel],
        lastSeen: record.timestamp,
        updatedAt: Date.now(),
      };
      const writeStore = txStore("playerProfiles", "readwrite");
      if (writeStore) await idbPut(writeStore, profile);
      return;
    }

    // EMA merge for scalar fields
    const updated: AggregatedPlayerProfile = {
      ...existing,
      gamesPlayed: existing.gamesPlayed + 1,
      winRate: existing.winRate * KEEP + isWin * ALPHA,
      bracketOffset: existing.bracketOffset * KEEP + record.playerProfile.bracketOffset * ALPHA,
      avgBidToPrizeRatio: existing.avgBidToPrizeRatio * KEEP + record.playerProfile.avgBidToPrizeRatio * ALPHA,
      tieFrequency: existing.tieFrequency * KEEP + record.playerProfile.tieFrequency * ALPHA,
      lastSeen: record.timestamp,
      updatedAt: Date.now(),
    };

    // highCardTimingDistribution: increment rounds where human played high cards then renormalise
    const dist = [...(existing.highCardTimingDistribution ?? new Array(13).fill(0))];
    for (const r of record.playerProfile.highCardRounds) {
      const idx = Math.min(r - 1, 12);
      dist[idx] = dist[idx] * KEEP + 1 * ALPHA;
    }
    const total = dist.reduce((s, v) => s + v, 0);
    updated.highCardTimingDistribution = total > 0 ? dist.map(v => v / total) : dist;

    // dominanceResponseMatrix: simple EMA on each key's numeric fields
    const newMatrix = { ...existing.dominanceResponseMatrix };
    for (const [key, val] of Object.entries(record.playerProfile.dominanceResponseMatrix ?? {})) {
      const k = key as keyof typeof newMatrix;
      const prev = newMatrix[k];
      if (!prev) {
        newMatrix[k] = val;
      } else {
        newMatrix[k] = {
          count: prev.count + (val?.count ?? 0),
          humanBidSum: prev.humanBidSum * KEEP + (val?.humanBidSum ?? 0) * ALPHA,
          humanBidAbovePrediction: prev.humanBidAbovePrediction * KEEP + (val?.humanBidAbovePrediction ?? 0) * ALPHA,
        };
      }
    }
    updated.dominanceResponseMatrix = newMatrix;

    // strategyHistory: append, keep last 10
    const history = [...(existing.strategyHistory ?? []), record.playerProfile.strategyLabel];
    updated.strategyHistory = history.slice(-10);

    const writeStore = txStore("playerProfiles", "readwrite");
    if (writeStore) await idbPut(writeStore, updated);
  } catch {
    // fail silently
  }
}

export async function getPlayerProfile(playerId: string): Promise<AggregatedPlayerProfile | null> {
  try {
    const store = txStore("playerProfiles", "readonly");
    if (!store) return null;
    return await idbGet<AggregatedPlayerProfile>(store, playerId);
  } catch {
    return null;
  }
}

export async function saveGlobalPriors(priors: GlobalPriors): Promise<void> {
  try {
    const store = txStore("globalPriors", "readwrite");
    if (store) await idbPut(store, priors);
  } catch {
    // fail silently
  }
}

export async function getGlobalPriors(): Promise<GlobalPriors | null> {
  try {
    if (!db) return null;
    return await new Promise<GlobalPriors | null>((resolve) => {
      const store = txStore("globalPriors", "readonly");
      if (!store) { resolve(null); return; }
      // Cursor through all to find max version
      const req = store.openCursor(null, "prev"); // descending by key = version
      req.onsuccess = () => {
        const cursor = req.result;
        resolve(cursor ? (cursor.value as GlobalPriors) : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function queueFailedSync(record: GameRecord): void {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    const queue: GameRecord[] = raw ? JSON.parse(raw) : [];
    if (queue.length >= MAX_SYNC_QUEUE) queue.shift(); // drop oldest
    queue.push(record);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // fail silently
  }
}

export function getFailedSyncQueue(): GameRecord[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearSyncQueue(): void {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch {
    // fail silently
  }
}
