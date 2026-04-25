# Developer Notes

Technical context for anyone working on this codebase.

---

## Architecture

**Frontend:** React 18 + Vite + TypeScript + Tailwind CSS  
**Backend:** Supabase Edge Function (Deno + Hono.js)  
**Database:** Supabase PostgreSQL — single key-value table  
**Multiplayer:** Polling-based (2-second intervals), no WebSockets

The frontend talks exclusively to one edge function (`make-server-b59f8b43`). All game state lives in the `kv_store_01880f2a` table as JSONB blobs keyed by `game_<CODE>`.

### Key Files

| File | Purpose |
|------|---------|
| `src/app/App.tsx` | Screen router (lobby → waiting → board) |
| `src/app/api.ts` | HTTP client for all edge function calls |
| `src/app/components/GameBoard.tsx` | Main game UI and state sync loop |
| `supabase/functions/make-server-b59f8b43/index.tsx` | All game logic (create/join/play/next-round) |
| `supabase/functions/make-server-b59f8b43/kv_store.tsx` | Supabase DB wrapper |
| `utils/supabase/info.tsx` | Project credentials (auto-generated, do not edit) |

---

## API Endpoints

All routes are prefixed with `/make-server-b59f8b43`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Heartbeat check |
| `GET` | `/init` | Check if DB table exists |
| `POST` | `/game/create` | Create new game, returns `gameCode` |
| `POST` | `/game/join` | Join with `{ gameCode }` |
| `POST` | `/game/play` | Play card with `{ gameCode, playerNumber, card }` |
| `POST` | `/game/next-round` | Advance to next round |
| `GET` | `/game/:code` | Get full game state |

---

## Game State Shape

```typescript
interface GameState {
  status: "waiting" | "playing" | "finished"
  players: { id: string; number: 1 | 2; joinedAt: number }[]
  currentRound: number           // 1–13
  prizeDeck: Card[]              // remaining prize cards
  currentPrize: Card | null      // prize card up for grabs this round
  carriedOverPrizes: Card[]      // prizes carried from tied rounds
  player1Hand: Card[]
  player2Hand: Card[]
  player1Card: Card | null       // null = not played yet
  player2Card: Card | null
  player1WonCards: Card[]
  player2WonCards: Card[]
  phase: "select" | "reveal" | "game_over"
  lastRoundResult: { player1Card, player2Card, prize, winner: 0|1|2 } | null
  createdAt: number
}
```

---

## Known Bug: Prize Card Sync Glitch (Fixed)

**Issue (historical):** When a 2-player game starts, both players briefly see different prize cards before the UI corrects itself.

**Root cause:** Race condition — both clients were independently deriving the prize card from local state before the DB was read.

**Fixes already applied in `GameBoard.tsx`:**
- **Gate render:** `readyToRender` flag prevents the board from showing until `serverReady`, `currentPrize`, and `playerHand` are all confirmed from the server
- **Reconciliation check:** 2 seconds after mount, silently re-fetches and corrects any mismatch
- **No local derivation:** prize card always comes from `applyServerState()`, never generated client-side

**Prize deck source of truth:** The edge function generates the prize deck and first prize card at `POST /game/create`. Both players read it from the DB. Player 2 never generates a deck locally.

---

## UI Design Notes

Recent game board design changes (already implemented):

- **Battle area** padding: `26px 32px` (reduced from 32px top/bottom)
- **Prize card** scaled to `0.85` within its container
- **Status banner** lives inside the header bar, centered — not a floating pill below
- **Tie carry-over** shows previous prize stacked behind current (rotated −6°) with an orange `N CARDS` badge

---

## Deploying the Edge Function

```bash
# Install Supabase CLI first: https://supabase.com/docs/guides/cli
supabase login
supabase functions deploy make-server-b59f8b43 --project-ref rfdehdikogvisujmduuo
```

Environment variables the function needs (set in Supabase dashboard → Edge Functions → Secrets):
- `SUPABASE_URL` — auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — auto-provided by Supabase

---

## Database Table

One table, created once:

```sql
CREATE TABLE IF NOT EXISTS kv_store_01880f2a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix
  ON kv_store_01880f2a (key text_pattern_ops);

GRANT ALL ON TABLE kv_store_01880f2a TO postgres;
GRANT ALL ON TABLE kv_store_01880f2a TO service_role;
```

SQL editor: https://supabase.com/dashboard/project/rfdehdikogvisujmduuo/sql/new
