# Sprint 08 — Tracker & type hygiene

**Effort:** Small (1 session)  
**Impact:** Medium — contributor ergonomics  
**Depends on:** None (can interleave anytime)

## Goal

Finish remaining contributor ergonomics after v4 tracker renames (file renames and public field alignment shipped in Sprint 06 follow-up).

## Tasks

- [x] **Tracker file naming** — `game-tracker.ts`, `piece-tracker.ts`, `tile/tile-tracker.ts`
- [x] **Public tracker counter names** — `GameTracker.games`, `TileTracker.movesGame` / `movesTotal`
- [x] **README API fixes** — `generateHeatmap`, `results`, `games`, `movesTotal`

- [x] **Deduplicate `BoardIndex` / `isBoardIndex`**
    - Consolidate copies in [`src/board/board-coords.ts`](../src/board/board-coords.ts), tile tracker types, piece-names, tile-grid

- [x] **Document custom tracker MT contract**
    - `static trackerId`, `static workerModule = import.meta.url`, `merge()` requirements
    - File: README or AGENTS.md

## Done when

- No misleading `*-base.ts` filenames without a documented reason.
- README matches shipped API.
- `BoardIndex` / `isBoardIndex` have a single source of truth.

## Verification

```bash
npm test
npm run typecheck
npm run lint
```
