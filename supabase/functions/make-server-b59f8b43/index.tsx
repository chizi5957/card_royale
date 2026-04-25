import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
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
  return [...h, ...d].sort(() => Math.random() - 0.5);
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
}

// ── Routes ───────────────────────────────────────────────────

// Setup - check and initialize database
app.get(`${PREFIX}/init`, async (c) => {
  try {
    const { createClient } = await import("jsr:@supabase/supabase-js@2.49.8");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Test if table exists
    const { error: testError, data } = await supabase
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

    const gs = (await kv.get(`game_${gameCode}`)) as GameState | null;
    if (!gs) return c.json({ error: "Game not found" }, 404);
    if (gs.players.length >= 2)
      return c.json({ error: "Game is full" }, 400);

    gs.players.push({ id: "p2", number: 2, joinedAt: Date.now() });
    gs.status = "playing";
    await kv.set(`game_${gameCode}`, gs);
    return c.json({ success: true, playerNumber: 2 });
  } catch (err) {
    console.log("Error in /game/join:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Play card
app.post(`${PREFIX}/game/play`, async (c) => {
  try {
    const { gameCode, playerNumber, card } = await c.req.json();
    if (!gameCode || !playerNumber || !card)
      return c.json({ error: "Missing required fields" }, 400);

    const gs = (await kv.get(`game_${gameCode}`)) as GameState | null;
    if (!gs) return c.json({ error: "Game not found" }, 404);
    if (gs.phase !== "select")
      return c.json({ error: "Not select phase" }, 400);

    if (playerNumber === 1) {
      gs.player1Card = card;
      gs.player1Hand = gs.player1Hand.filter(
        (ci: Card) => ci.rank !== card.rank,
      );
    } else {
      gs.player2Card = card;
      gs.player2Hand = gs.player2Hand.filter(
        (ci: Card) => ci.rank !== card.rank,
      );
    }

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
        gs.carriedOverPrizes = prizes;
      }

      gs.lastRoundResult = {
        player1Card: gs.player1Card,
        player2Card: gs.player2Card,
        prize: cp || { rank: "X", suit: "hearts", value: 0 },
        winner,
      };
    }

    await kv.set(`game_${gameCode}`, gs);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error in /game/play:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Next round
app.post(`${PREFIX}/game/next-round`, async (c) => {
  try {
    const { gameCode } = await c.req.json();
    if (!gameCode) return c.json({ error: "Game code required" }, 400);

    const gs = (await kv.get(`game_${gameCode}`)) as GameState | null;
    if (!gs) return c.json({ error: "Game not found" }, 404);
    if (gs.phase !== "reveal") return c.json({ success: true });

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

    await kv.set(`game_${gameCode}`, gs);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error in /game/next-round:", err);
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
