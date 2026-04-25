Here's the detailed Figma Make prompt:

Figma Make: Game Board UI Updates
Four specific changes to the main game board screen. Do not change any game logic, state management, or functionality.

CHANGE 1 — Reduce Battle Area Container Height
Find the main center panel that contains the Bot card slot, Prize Card, and Your card slot:

Reduce padding-top by 6px — from current value to current - 6px
Reduce padding-bottom by 6px — from current value to current - 6px
Scale down the Prize Card only — apply transform: scale(0.85) to the prize card component
Do not change the Bot or Your card slot sizes
Do not change the Last Round bar or Your Hand section below


CHANGE 2 — Increase Score Pile Panel Width
Find the left panel (Bot score pile) and right panel (You score pile) that sit on either side of the battle area:

Increase width of both panels from current value to 58px wider
Keep all other properties — background, border, border-radius, padding — identical
The won cards stack visualization inside should remain centered within the new wider panel
Bot card count label at the bottom stays unchanged


CHANGE 3 — Move Status Banner into Header Bar
Currently "SELECT A CARD TO PLAY" / "WAITING FOR OPPONENT" / "YOU WIN THIS ROUND" etc. appears as a floating pill below the header. Move it into the header bar itself:

Remove the status banner from its current position below the header
Place it centered inside the header bar between the left side (Game badge + Round counter) and right side (VS Bot badge + New Game button)
Style: keep the same pill/badge shape and colors — blue for Your Turn, orange for Waiting, green for Win, gray for Tie
It should sit vertically centered within the header bar height
On mobile, if it doesn't fit, show it on a second line below the header bar


CHANGE 4 — Tie Carry-Over Visual in Prize Card Area
This is the most important change. When a tie occurs and the prize carries to the next round, the battle area currently just shows the new prize card. Make the carry-over visually clear:
During a tie carry-over round, show the following in the Prize Card slot:

The previous tied prize card partially visible behind the current prize card — rotated -6deg, offset left: -8px, top: -8px, opacity: 0.85, same card size but behind using z-index: 0
The current new prize card on top at normal position, z-index: 1, full opacity, gold border glow as usual
A small badge overlaid on the bottom-right of the card stack:

Background: #F97316 (orange)
Text: "×2 CARDS" or "×N CARDS" where N = total carried cards
font-size: 10px, Goldman Sans bold, white text
border-radius: 4px, padding: 2px 6px
Position: bottom: -8px, right: -8px, z-index: 2


Below the card stack, keep the existing "+1 CARRIED (TOTAL: X)" text in orange — make it slightly larger at font-size: 13px and bold so it's more readable
If 3 or more cards are carried, show only 2 cards visually (top + one behind) but update the badge count to reflect the real total

When there is NO carry-over — show only the single prize card as normal with no badge or stacked card behind it.

Summary of all 4 changes:
#WhatWhere1Reduce padding ±6px + scale prize card 0.85Battle area center panel2Widen side panels by 58pxLeft and right score pile panels3Move status banner into header bar centeredTop navigation header4Show stacked cards + orange badge on tie carry-overPrize card slot in battle area
Do not touch any other screen, component, or game logic outside of these four changes.