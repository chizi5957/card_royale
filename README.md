# Card Royale — The Bidding War

A two-player card game where you bid your cards to win prize cards. Play against a friend online or challenge the bot.

---

## What Is This Game?

Each player gets 13 cards (one full suit). A shuffled prize deck sits in the middle. Every round, both players secretly choose a card to play — whoever plays the higher card wins that round's prize. Ties carry the prize to the next round (bigger stakes!). The player with the most prize points after 13 rounds wins.

**Two ways to play:**
- **Multiplayer** — Create a game, share the 6-letter code with a friend, they join from their browser
- **vs Bot** — Play instantly against a computer opponent

---

## One-Time Setup (Do This First)

The game uses Supabase to store game state online. You need to create one database table before multiplayer works.

### Step 1 — Open the SQL Editor

Click this link:
[https://supabase.com/dashboard/project/rfdehdikogvisujmduuo/sql/new](https://supabase.com/dashboard/project/rfdehdikogvisujmduuo/sql/new)

### Step 2 — Run This SQL

Copy the block below, paste it into the SQL editor, and click **Run**:

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

### Step 3 — Done!

Refresh the game and you're ready to play. This step only needs to be done once.

> **Bot mode works without this step** — only multiplayer requires the database.

---

## Running the Game Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure (for developers)

```
Card royale/
├── src/app/            → All game screens and components
│   ├── App.tsx         → Main app (handles screen navigation)
│   ├── api.ts          → Talks to the backend server
│   └── components/     → Individual UI pieces (GameBoard, GameLobby, etc.)
├── supabase/
│   ├── functions/make-server-b59f8b43/   → Backend server (runs on Supabase Edge)
│   └── migrations/     → Database setup SQL
├── utils/supabase/     → Supabase project credentials
└── docs/               → Additional documentation
```

---

## Deploying the Backend (Edge Function)

If you need to redeploy the backend server, install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:

```bash
supabase login
supabase functions deploy make-server-b59f8b43 --project-ref rfdehdikogvisujmduuo
```

---

## Docs

- [How to Play](docs/HOW_TO_PLAY.md) — Full game rules
- [Developer Notes](docs/DEVELOPER.md) — Architecture and known bugs
- [Attributions](ATTRIBUTIONS.md) — Open source licenses
