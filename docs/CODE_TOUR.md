# Code Tour — For Designers

A plain-English map of this project. No coding knowledge needed.
Use it to find **where to change what**.

---

## The 30-Second Version

The game is built from **screens**. Each screen is one file inside
`src/app/components/`. If you can see it on screen, it lives in one of
these files:

| What you see | File to open |
|---|---|
| Main menu (Create / Join / Play vs Bot) | `GameLobby.tsx` |
| "Enter your name" screen | `NameEntry.tsx` |
| "Share this code" waiting screen | `WaitingRoom.tsx` |
| The game itself (cards, prize, scores) | `GameBoard.tsx` |
| "You Win / You Lose" popup at the end | `GameOver.tsx` |
| "How to Play" instructions popup | `HowToPlay.tsx` |
| A single playing card (the visual) | `PlayingCard.tsx` |
| The shiny 3D buttons used everywhere | `FancyButton.tsx` |
| The pile of won cards + score in sidebars | `CardPile.tsx` |

`App.tsx` is the "traffic controller" — it decides which screen shows
when. It contains almost no visuals.

---

## Changing How Things Look

- **Colors, fonts, spacing** — most colors come from *design tokens*
  (named values like `var(--status-win)`) defined in
  `src/styles/index.css`. Change a token there and it updates everywhere
  it's used.
- **One specific element** — open the screen file from the table above
  and search (Cmd+F) for a nearby text label, e.g. search `"Your Hand"`
  in `GameBoard.tsx` to find the hand panel.
- **Mobile vs desktop** — many parts are built twice: elements marked
  `sm:hidden` show **only on phones**; elements marked `hidden sm:flex`
  show **only on desktop**. If you change one, check the other.

---

## Changing How the Game Plays

- **Game rules for online 2-player games** live on the server:
  `supabase/functions/make-server-b59f8b43/index.tsx`.
  This file is the referee — it deals hands, compares cards, awards
  prizes, handles ties. It has comments explaining each part.
  ⚠️ After editing it, it must be re-deployed to Supabase (ask a
  developer or Claude to do this — saving the file alone is not enough).
- **Bot opponent's "thinking"** lives in `src/app/botBrain.ts`.
  It decides which card the bot plays each round.
- **Bot-mode round flow** (reveal timing, next round, game over) is in
  `GameBoard.tsx` — look for `resolveRoundBot` and `nextRoundBot`.

---

## How Multiplayer Works (In Plain English)

1. Player 1 taps **Create Game** → the server invents a 6-letter code
   and a fresh game (shuffled prize deck, 13 cards each).
2. Player 2 types the code → the server adds them to the same game.
3. Every 2 seconds, each player's app asks the server:
   *"anything new?"* (this is called **polling**).
4. When you play a card, your app tells the server. Once **both**
   cards are in, the server decides the winner and both apps see the
   result on their next poll.
5. After 13 rounds the server marks the game finished and the
   Game Over popup appears.

There is deliberate protection for the moment when **both players tap
at the same time** (which happens constantly in this game) — the server
processes the two plays one after the other so neither is lost.

---

## The Three Places The Game Runs

| Platform | How it gets there |
|---|---|
| Web / PWA | Pushing to GitHub `main` auto-deploys via Vercel |
| iPhone app | `npm run cap:ios` → opens Xcode → press Run |
| Android app | `npm run cap:android` → opens Android Studio → press Run |

All three are the **same code**. Fix a bug once, rebuild each app.

---

## Things That Are Safe To Ignore

- `src/app/components/ui/` — a library of pre-made components (mostly unused)
- `src/lib/` — background machinery that saves bot-game statistics
- `utils/supabase/info.tsx` — auto-generated credentials, never edit
- `android/`, `ios/` — auto-generated native app shells
- `dist/` — the built output, regenerated on every build

---

## Known Quirks

- The Supabase backend (free tier) **pauses itself after ~1 week of
  no traffic**. Symptom: multiplayer stops working, bot mode still fine.
  Fix: open the [Supabase dashboard](https://supabase.com/dashboard/project/rfdehdikogvisujmduuo)
  and click **Restore**, then wait 2 minutes.
- Ace is the LOWEST card (1 point), King is the highest (13). This is a
  game rule, not a bug.
