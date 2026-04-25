Here's the Figma Make prompt:

---

## Figma Make: Fix Prize Card Sync Glitch on Game Start

**Bug:** When a 2-player game starts, both players briefly see different prize cards for a few seconds before the UI corrects itself and shows the same card. This is a race condition in how the first round's prize card is fetched and displayed.

---

**Root Cause to Investigate**

The glitch happens because both clients are independently generating or fetching the first prize card rather than reading it from a single source of truth in Supabase. One or both clients is likely:

- Generating the prize deck client-side and picking the first card locally before the round data is written to the database
- Rendering a card from local state before the Supabase `rounds` table row for Round 1 is confirmed
- Not waiting for the real-time subscription to confirm the round data before displaying

---

**Fix 1 — Prize Deck Must Be Written by Host Only**

Only Player 1 (the game creator) should generate and shuffle the prize deck. It must be written to the `games` table in Supabase immediately when the game is created — not when the second player joins:

```
games.prize_deck = shuffled array of all 26 red cards written at game creation time
```

Player 2 must never generate their own prize deck. Both players must read `prize_deck` exclusively from the `games` table row.

---

**Fix 2 — Round 1 Must Be Created Before Both Players See the Board**

The game board must not render for either player until Round 1 exists in the `rounds` table with a confirmed `prize_card` value.

Only Player 1 creates Round 1 by writing the first prize card to:
```
rounds: { game_id, round_number: 1, prize_card: prize_deck[0], resolved: false }
```

This write must happen server-side or by Player 1 immediately after Player 2 joins and game status flips to `active`.

---

**Fix 3 — Both Players Must Read Prize Card from Supabase Only**

Remove any code that derives or displays the prize card from local state, props, or a locally generated deck. Replace with:

```javascript
// On game start — subscribe to rounds table
supabase
  .from('rounds')
  .select('*')
  .eq('game_id', gameId)
  .eq('round_number', currentRound)
  .single()
  .then(({ data }) => {
    setPrizeCard(data.prize_card) // only set from DB
  })
```

The prize card display must be gated behind this data being available. Show a loading state until the round row is confirmed from Supabase — do not derive it locally.

---

**Fix 4 — Gate the Game Board Render**

Neither player should see the game board until ALL of the following are true:

```javascript
const readyToRender = 
  gameStatus === 'active' &&        // both players connected
  currentRound !== null &&           // round number confirmed
  prizeCard !== null &&              // prize card loaded from DB
  playerHand.length > 0             // hand dealt and confirmed
```

Until `readyToRender` is true, show a transitional loading screen:
- Same purple card container as other screens
- Spinner (existing small spinner component)
- Text: "Setting up the battlefield..." 
- Goldman Sans, uppercase, white

This prevents either player from seeing a stale or locally generated card.

---

**Fix 5 — Real-time Subscription Ordering**

Ensure the Supabase Realtime subscription for the `rounds` table is set up BEFORE the game status is flipped to `active`. The sequence must be:

1. Player 2 joins → `players` table updated
2. Player 1 detects Player 2 joined
3. **Both clients subscribe to `rounds` table realtime**
4. Player 1 writes Round 1 to `rounds` table
5. Both clients receive Round 1 via realtime subscription simultaneously
6. **Both clients render game board at the same time with the same prize card**

If Step 3 happens after Step 4, Player 2 misses the insert event and falls back to local state — causing the glitch.

---

**Fix 6 — Add a Reconciliation Check**

As a safety net, after the game board renders, run a one-time check to verify both clients are showing the same round number and prize card:

```javascript
// 2 seconds after game board mounts
setTimeout(() => {
  supabase
    .from('rounds')
    .select('prize_card, round_number')
    .eq('game_id', gameId)
    .eq('round_number', currentRound)
    .single()
    .then(({ data }) => {
      if (data.prize_card.rank !== prizeCard.rank || 
          data.prize_card.suit !== prizeCard.suit) {
        // Force correct the local state silently
        setPrizeCard(data.prize_card)
      }
    })
}, 2000)
```

This silently corrects any remaining mismatch without a visible flash.

---

**What NOT to change:**
- Any game logic, scoring, or card play mechanics
- Any UI layout or visual design
- The bot game flow — this fix applies to 2-player multiplayer only
- Any existing Realtime subscriptions for player moves and round resolution

---

**In summary — the rule is simple:**

> The prize card must always come from Supabase. Never from local state. Never generated client-side. The board must not render until Supabase confirms the round exists.