// ╔════════════════════════════════════════════════════════════════════╗
// ║  GOPS (GAME OF PURE STRATEGY) — GAME SERVER (Supabase Edge Function)║
// ║                                                                      ║
// ║  This is the "referee" for 2-player online games.                   ║
// ║  Both players' apps talk to this server. It remembers the game      ║
// ║  state (whose turn, cards left, scores) in a small database table.  ║
// ║                                                                      ║
// ║  Bot games do NOT use this file — they run entirely on the phone.   ║
// ║                                                                      ║
// ║  Routes (what the app can ask the server to do):                    ║
// ║    POST /game/create      → start a new game, get a 6-letter code   ║
// ║    POST /game/join        → second player joins with that code      ║
// ║    POST /game/play        → a player secretly plays one card        ║
// ║    POST /game/next-round  → advance after both cards are revealed   ║
// ║    POST /game/rematch     → vote to restart; resets when both agree ║
// ║    GET  /game/:code       → read the current game state (polling)   ║
// ╚════════════════════════════════════════════════════════════════════╝
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

// ── App setup ────────────────────────────────────────────────
const app = new Hono();

app.use("*", cors());
app.use("*", logger(console.log));

const PREFIX = "/make-server-b59f8b43";

// ── Card helpers ─────────────────────────────────────────────
interface Card {
  rank: string;
  suit: "hearts" | "diamonds" | "spades" | "clubs";
  value: number;
}

const RANKS = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
];

function generateGameCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function playerDeck(n: 1 | 2): Card[] {
  const suit = n === 1 ? "spades" : "clubs";
  return RANKS.map((rank, i) => ({ rank, suit, value: i + 1 }));
}

// Fisher-Yates shuffle — every ordering equally likely
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function prizeDeck(): Card[] {
  const h: Card[] = RANKS.map((r, i) => ({
    rank: r,
    suit: "hearts" as const,
    value: i + 1,
  }));
  const d: Card[] = RANKS.map((r, i) => ({
    rank: r,
    suit: "diamonds" as const,
    value: i + 1,
  }));
  return shuffle([...h, ...d]);
}

interface GameState {
  status: "waiting" | "playing" | "finished";
  players: { id: string; number: 1 | 2; joinedAt: number }[];
  currentRound: number;
  prizeDeck: Card[];
  currentPrize: Card | null;
  carriedOverPrizes: Card[];
  player1Hand: Card[];
  player2Hand: Card[];
  player1Card: Card | null;
  player2Card: Card | null;
  player1WonCards: Card[];
  player2WonCards: Card[];
  phase: "select" | "reveal" | "game_over";
  lastRoundResult: {
    player1Card: Card;
    player2Card: Card;
    prize: Card;
    winner: 1 | 2 | 0;
  } | null;
  createdAt: number;
  // Version counter for optimistic locking (see atomicUpdate below)
  version?: number;
  // Rematch handshake: each player votes; when both have voted the game resets
  rematchVotes?: { p1?: boolean; p2?: boolean };
}

// Build a fresh round-1 state, keeping the same players and game code
function freshGameFields() {
  const pd = prizeDeck();
  return {
    currentRound: 1,
    prizeDeck: pd,
    currentPrize: pd.shift() || null,
    carriedOverPrizes: [] as Card[],
    player1Hand: playerDeck(1),
    player2Hand: playerDeck(2),
    player1Card: null,
    player2Card: null,
    player1WonCards: [] as Card[],
    player2WonCards: [] as Card[],
    phase: "select" as const,
    lastRoundResult: null,
    rematchVotes: {},
  };
}

// ── Atomic update helper ─────────────────────────────────────
// PROBLEM: both players often act at the exact same moment (they both
// bid a card each round). If two requests read the game, change it, and
// write it back at the same time, the second write silently erases the
// first one ("lost update") and the game hangs.
//
// SOLUTION: every game state carries a version number. We only write if
// the version in the database is still the one we read (compare-and-set).
// If someone else got there first, we re-read and try again.
const db = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

async function atomicUpdate(
  key: string,
  mutate: (gs: GameState) => { error?: string; status?: number } | void,
): Promise<{ gs?: GameState; error?: string; status?: number }> {
  const supabase = db();
  for (let attempt = 0; attempt < 6; attempt++) {
    const gs = (await kv.get(key)) as GameState | null;
    if (!gs) return { error: "Game not found", status: 404 };

    const expectedVersion = gs.version ?? 0;
    const result = mutate(gs);
    if (result?.error) return { error: result.error, status: result.status ?? 400 };

    gs.version = expectedVersion + 1;

    // Write only if nobody else changed the row since we read it
    const { data, error } = await supabase
      .from("kv_store_01880f2a")
      .update({ value: gs })
      .eq("key", key)
      .filter("value->>version", "eq", String(expectedVersion))
      .select("key");

    if (error) return { error: error.message, status: 500 };
    if (data && data.length > 0) return { gs }; // success

    // Conflict — someone updated first. Small backoff, then retry.
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 80));
  }
  return { error: "Server busy, please retry", status: 409 };
}

// ── Routes ───────────────────────────────────────────────────

// Setup - check and initialize database
app.get(`${PREFIX}/init`, async (c) => {
  try {
    const supabase = db();

    // Test if table exists
    const { error: testError } = await supabase
      .from("kv_store_01880f2a")
      .select("key")
      .limit(1);

    if (!testError) {
      return c.json({
        status: "ok",
        message: "✅ Database is ready! Table exists.",
        tableExists: true
      });
    }

    // Table doesn't exist
    const sql = `CREATE TABLE IF NOT EXISTS kv_store_01880f2a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix
  ON kv_store_01880f2a (key text_pattern_ops);

GRANT ALL ON TABLE kv_store_01880f2a TO postgres;
GRANT ALL ON TABLE kv_store_01880f2a TO service_role;`;

    return c.json({
      status: "setup_required",
      message: "⚠️  Database table missing. Please create it.",
      tableExists: false,
      instructions: {
        step1: "Open Supabase SQL Editor",
        url: "https://supabase.com/dashboard/project/rfdehdikogvisujmduuo/sql/new",
        step2: "Copy and run this SQL:",
        sql: sql,
        step3: "Refresh your app"
      },
      sql: sql
    }, 503);
  } catch (err) {
    console.log("Init check error:", err);
    return c.json({ error: String(err), status: "error" }, 500);
  }
});

// Health check
app.get(`${PREFIX}/health`, (c) =>
  c.json({ status: "ok", ts: Date.now() }),
);

// Create game
app.post(`${PREFIX}/game/create`, async (c) => {
  try {
    const gameCode = generateGameCode();
    const pd = prizeDeck();
    const currentPrize = pd.shift() || null;

    const state: GameState = {
      status: "waiting",
      players: [{ id: "p1", number: 1, joinedAt: Date.now() }],
      currentRound: 1,
      prizeDeck: pd,
      currentPrize,
      carriedOverPrizes: [],
      player1Hand: playerDeck(1),
      player2Hand: playerDeck(2),
      player1Card: null,
      player2Card: null,
      player1WonCards: [],
      player2WonCards: [],
      phase: "select",
      lastRoundResult: null,
      createdAt: Date.now(),
      version: 0,
    };

    await kv.set(`game_${gameCode}`, state);
    return c.json({ gameCode, playerNumber: 1 });
  } catch (err) {
    console.log("Error in /game/create:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Join game
app.post(`${PREFIX}/game/join`, async (c) => {
  try {
    const { gameCode } = await c.req.json();
    if (!gameCode) return c.json({ error: "Game code required" }, 400);

    const result = await atomicUpdate(`game_${gameCode}`, (gs) => {
      if (gs.players.length >= 2) return { error: "Game is full" };
      gs.players.push({ id: "p2", number: 2, joinedAt: Date.now() });
      gs.status = "playing";
    });

    if (result.error) return c.json({ error: result.error }, result.status as any);
    return c.json({ success: true, playerNumber: 2 });
  } catch (err) {
    console.log("Error in /game/join:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Play card — each player secretly plays one card per round.
// When the second card arrives, the round is resolved right here.
app.post(`${PREFIX}/game/play`, async (c) => {
  try {
    const { gameCode, playerNumber, card } = await c.req.json();
    if (!gameCode || !playerNumber || !card)
      return c.json({ error: "Missing required fields" }, 400);

    const result = await atomicUpdate(`game_${gameCode}`, (gs) => {
      if (gs.phase !== "select") return { error: "Not select phase" };

      const isP1 = playerNumber === 1;

      // Guard 1: you can only play once per round
      if (isP1 ? gs.player1Card : gs.player2Card)
        return { error: "Already played this round" };

      // Guard 2: the card must actually be in your hand
      const hand = isP1 ? gs.player1Hand : gs.player2Hand;
      const inHand = hand.some((ci: Card) => ci.rank === card.rank);
      if (!inHand) return { error: "Card not in hand" };

      if (isP1) {
        gs.player1Card = card;
        gs.player1Hand = gs.player1Hand.filter((ci: Card) => ci.rank !== card.rank);
      } else {
        gs.player2Card = card;
        gs.player2Hand = gs.player2Hand.filter((ci: Card) => ci.rank !== card.rank);
      }

      // Both cards down? Resolve the round: higher card takes the prize(s).
      if (gs.player1Card && gs.player2Card) {
        gs.phase = "reveal";
        const p1 = gs.player1Card.value;
        const p2 = gs.player2Card.value;
        const cp = gs.currentPrize;
        const prizes = cp
          ? [cp, ...gs.carriedOverPrizes]
          : [...gs.carriedOverPrizes];

        let winner: 0 | 1 | 2 = 0;
        if (p1 > p2) {
          winner = 1;
          gs.player1WonCards = [...gs.player1WonCards, ...prizes];
          gs.carriedOverPrizes = [];
        } else if (p2 > p1) {
          winner = 2;
          gs.player2WonCards = [...gs.player2WonCards, ...prizes];
          gs.carriedOverPrizes = [];
        } else {
          // Tie — prize carries over to next round's pot
          gs.carriedOverPrizes = prizes;
        }

        gs.lastRoundResult = {
          player1Card: gs.player1Card,
          player2Card: gs.player2Card,
          prize: cp || { rank: "X", suit: "hearts", value: 0 },
          winner,
        };
      }
    });

    if (result.error) return c.json({ error: result.error }, result.status as any);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error in /game/play:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Next round — called by clients ~4s after a reveal.
// Both clients call it; the version check makes the second call a no-op.
app.post(`${PREFIX}/game/next-round`, async (c) => {
  try {
    const { gameCode } = await c.req.json();
    if (!gameCode) return c.json({ error: "Game code required" }, 400);

    const result = await atomicUpdate(`game_${gameCode}`, (gs) => {
      if (gs.phase !== "reveal") return; // already advanced — fine

      if (gs.currentRound >= 13) {
        gs.phase = "game_over";
        gs.status = "finished";
      } else {
        gs.currentRound += 1;
        gs.currentPrize = gs.prizeDeck.shift() || null;
        gs.player1Card = null;
        gs.player2Card = null;
        gs.phase = "select";
      }
    });

    if (result.error) return c.json({ error: result.error }, result.status as any);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error in /game/next-round:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Rematch — both players must opt in, then the game resets in place.
// Each client polls /game/:code, sees rematchVotes, and shows the state
// ("waiting for opponent" / "opponent wants a rematch") on the end screen.
app.post(`${PREFIX}/game/rematch`, async (c) => {
  try {
    const { gameCode, playerNumber } = await c.req.json();
    if (!gameCode || !playerNumber)
      return c.json({ error: "Missing required fields" }, 400);

    const result = await atomicUpdate(`game_${gameCode}`, (gs) => {
      // Already restarted (opponent's vote landed the reset first) — fine
      if (gs.status === "playing") return;
      if (gs.status !== "finished") return { error: "Game not finished" };

      const votes = gs.rematchVotes ?? {};
      if (playerNumber === 1) votes.p1 = true;
      else votes.p2 = true;
      gs.rematchVotes = votes;

      if (votes.p1 && votes.p2) {
        Object.assign(gs, freshGameFields());
        gs.status = "playing";
      }
    });

    if (result.error) return c.json({ error: result.error }, result.status as any);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error in /game/rematch:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Get game state
app.get(`${PREFIX}/game/:code`, async (c) => {
  try {
    const code = c.req.param("code");
    const gs = await kv.get(`game_${code}`);
    if (!gs) return c.json({ error: "Game not found" }, 404);
    return c.json(gs);
  } catch (err) {
    console.log("Error in /game/:code:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ── Start ────────────────────────────────────────────────────
Deno.serve(app.fetch);
