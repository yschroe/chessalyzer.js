# Sprint 08 — Tracker & type hygiene

**Effort:** Small (1 session)  
**Impact:** Medium — contributor ergonomics  
**Depends on:** None (can interleave anytime)

## Goal

Clarify tracker module layout and fix doc drift without breaking public exports.

## Tasks

- [ ] **Tracker file naming**
    - `game-tracker-base.ts` exports concrete `GameTracker` — rename to `game-tracker.ts` or clarify re-exports in index
    - Same for `piece-tracker-base.ts`, `tile-tracker-base.ts` if desired
    - Keep public symbol names stable (`GameTracker`, `PieceTracker`, `TileTracker`)

- [ ] **Deduplicate `BoardIndex` / `isBoardIndex`**
    - Consolidate copies in [`src/board/board-coords.ts`](../src/board/board-coords.ts), tile tracker types, piece-names, tile-grid

- [ ] **README API fixes**
    - `generateHeatMap` → `generateHeatmap`
    - `GameTracker.result` → `results`
    - Fix swapped `SquareData` color/name comments

- [ ] **Document custom tracker MT contract**
    - `static trackerId`, `static workerModule = import.meta.url`, `merge()` requirements
    - File: README or AGENTS.md

## Done when

- No misleading `*-base.ts` filenames without a documented reason, or re-exports are explicit.
- README matches shipped API.

## Verification

```bash
npm test
npm run typecheck
npm run lint
```
