# Nexus

A guess-the-hidden-topic game built on the same clue taxonomy as
[Hypha](https://github.com/shunt12345/rabit-hole): every puzzle has a secret
center topic surrounded by six clues split into **direct** (concrete facts),
**indirect** (an adjacent field, one conceptual leap away), and **tangent**
(a wildly unrelated-looking fact connected by a hidden shared property).

## The game

Each puzzle starts with 4 of 6 clue nodes visible — the 2 tangent and 2
indirect ones, the hardest pair each. The 2 direct clues stay locked as
hints you can pay points to reveal. Guess the center topic in as few nodes
(and as few wrong guesses) as possible.

- **Daily** mode picks a deterministic puzzle for the day (shareable, like
  Wordle).
- **Practice** mode serves a random puzzle from the pool.

Scoring starts at 100 and drops 30 points per hint revealed and 5 points
per wrong guess, floored at 10.

## Running it

```
npm install
npm run dev
```

Puzzle content lives in `src/puzzles.ts` — add more by following the
existing shape (exactly 2 direct / 2 indirect / 2 tangent clues per
puzzle, plus an `accepted` list of alternate spellings that count as a
correct guess).

## What's not built yet

- No backend — puzzles are static and bundled at build time, unlike
  Hypha's live Claude-generated content.
- No persistence of streaks/stats across sessions.
- No AI-generated puzzles yet; a natural next step would be reusing
  Hypha's Supabase Edge Function to generate new direct/indirect/tangent
  clue sets for an arbitrary topic on demand.
