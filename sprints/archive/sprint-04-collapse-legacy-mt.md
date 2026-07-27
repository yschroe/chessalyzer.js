# Sprint 04 — Collapse legacy multithread path

**Effort:** Large (4+ sessions)  
**Impact:** High — filtered and limited runs avoid parse → re-encode → re-parse  
**Depends on:** Sprint 01 (buffer fix), Sprint 03 (worker infra) recommended

## Goal

Eliminate the legacy MT path where the main thread assembles/filters games, re-encodes them via `gamesToPgnChunk`, and sends batches to workers for a second parse.

## Background

Today `normalizeAnalysisConfigs` sets `useWorkerParse = false` when any config has a filter or finite `maxGames`:

```74:76:src/core/analysis-config.ts
        if (tempCfg.config.hasFilter || tempCfg.config.cntGames !== Infinity) {
            useWorkerParse = false;
        }
```

That forces [`processPGNOnMainThread`](../src/core/game-processor.ts) with `gamesToPgnChunk` + `encodePgnChunkText` — expensive and architecturally awkward.

## Tasks

- [ ] **Design: filter/limit on worker-parse path**
    - Option A: Main thread streams chunks; workers apply filter/limit during assemble (headers already available when `readInHeader`).
    - Option B: Main thread pre-filters at chunk boundaries (only dispatch games matching filter) — harder at byte-chunk boundaries.
    - Document chosen approach in `AGENTS.md`.

- [ ] **Move filter evaluation to worker-side assemble**
    - `parseGamesFromLines` + `GameAssembler` already support headers when `readInHeader: true`.
    - Pass filter predicate: **cannot** send functions to workers — need serializable filter (see sub-task).

- [ ] **Serializable filters (if needed)**
    - Short term: keep filter on main thread but avoid re-encode — evaluate filter after worker returns assembled games (requires worker to return game objects, not just counts — bigger change).
    - Long term: expression-based filters (`{ header: 'WhiteElo', op: '>', value: 2000 }`) sendable to workers.
    - Or: accept that custom JS filters stay on main thread but use a single-parse pipeline (workers return parsed games to main for filter — measure memory).

- [ ] **Implement `maxGames` on worker path**
    - Wire per-config game limit into worker batch processing (field exists but unused — Sprint 01).
    - Main thread marks config `isDone` when limit reached across batches.

- [ ] **Remove or narrow legacy path**
    - Delete `gamesToPgnChunk` dispatch from hot path, or restrict to `@internal` fallback.
    - Remove `batchSize` from internal types once legacy path gone.
    - Files: [`src/core/game-processor.ts`](../src/core/game-processor.ts), [`src/pgn/games-to-pgn.ts`](../src/pgn/games-to-pgn.ts)

- [ ] **Multi-run efficiency (optional in same sprint)**
    - Today N runs on worker-parse = N full parse+replay passes per chunk.
    - Parse chunk once, fan out to N tracker configs — significant win for comparison analyses.

- [ ] **Benchmark before/after**
    - Filtered run on corpus subset
    - `maxGames: 1000` on large file
    - Multi-run compare (two `TileTracker`s, different filters)
    - Commands: `npm run bench:perf`, ad-hoc corpus timing

## Files (primary)

| File                          | Change                 |
| ----------------------------- | ---------------------- |
| `src/core/game-processor.ts`  | Unify paths            |
| `src/core/analysis-config.ts` | `useWorkerParse` logic |
| `src/pgn/game-assembler.ts`   | Filter/limit hooks     |
| `src/core/chess-worker.ts`    | Per-config limits      |
| `src/pgn/games-to-pgn.ts`     | Deprecate or delete    |
| `AGENTS.md`                   | Execution path docs    |

## Done when

- `analyzePGN` with `filter` or `maxGames` uses worker-parse path (or equivalent single-parse pipeline).
- No PGN re-encode in default multithreaded filtered runs.
- `batchSize` removed from codebase.
- Filtered corpus test runs multithreaded (`workers: true`) and matches single-threaded golden counts.
- No perf regression on unfiltered full-file bench.

## Verification

```bash
npm test
npm run bench:perf
# Corpus: filter + maxGames tests with workers enabled (not workers: false)
```

## Risks

- Custom JS `filter` functions cannot run in workers — may require hybrid design or documented limitation.
- Memory if workers post assembled `Game[]` back to main thread for filtering.

## Out of scope

- Public `parsePGN` streaming API (`IDEAS.md` § Public parse entry points)
