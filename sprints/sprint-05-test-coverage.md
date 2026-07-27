# Sprint 05 — Test coverage expansion

**Effort:** Medium (ongoing; can land incrementally after other sprints)  
**Impact:** High — protects perf-critical pipeline and documents expected behavior  
**Depends on:** Incrementally after Sprints 01–04 (each adds tests for its scope)

## Goal

Fill the largest testing gaps so refactors (especially Sprint 04) are safe and regressions are caught in CI.

## Tasks

### Worker & multithreading

- [ ] Worker-parse multi-run without filter (Sprint 01 regression)
- [ ] Filter + `maxGames` with **workers enabled** (after Sprint 04)
- [ ] Custom tracker + `workerModule` multithreaded (Sprint 03)
- [ ] Worker error propagation — bad batch returns `error` field, pool does not hang
- [ ] File: new `test/integration/workers.test.ts`

### Replay & parsing (unit level)

- [ ] `GameReplayer` unit tests: basic SAN sequence, capture, promotion, castling
- [ ] Trust-mode: known-good fixture moves produce expected board state (spot checks)
- [ ] `GameAssembler` / `parseGamesFromLines`: headers, incomplete trailing game
- [ ] Files: `src/replay/__tests__/`, `src/pgn/__tests__/`

### Trackers

- [ ] `TileTracker` golden values (corpus or fixture) — includes castling double-count behavior
- [ ] `GameTracker` / `PieceTracker` already partially covered by corpus — document gaps
- [ ] `merge()` correctness: simulate two partial tracker states, merge, assert totals

### Error policy (after Sprint 02)

- [ ] `onError: 'abort'` — corrupt game aborts run
- [ ] `onError: 'skip-game'` — partial file completes, `skippedGames > 0`
- [ ] Fixture: PGN with one illegal SAN mid-file

### Fixtures & CI

- [ ] Run at least one multithreaded integration test in default `npm test` (not only `workers: false`)
- [ ] Document when corpus tests are skipped and how to fetch corpus
- [ ] Optional: CI job with perf regression when `pgn/` present (too large for default CI — see `IDEAS.md`)

## Coverage matrix (target state)

| Area                | ST  | MT    | Notes              |
| ------------------- | --- | ----- | ------------------ |
| Basic parse counts  | ✓   | ✓     | fixtures + corpus  |
| Filter / maxGames   | ✓   | ○ → ✓ | MT after Sprint 04 |
| Multi-run           | ○   | ○ → ✓ | Sprint 01          |
| GameTracker golden  | ✓   | ✓     | corpus             |
| PieceTracker golden | ✓   | ✓     | corpus             |
| TileTracker golden  | ○   | ○     | add                |
| Custom tracker MT   | ○   | ○     | Sprint 03          |
| Replay unit         | ○   | —     | add                |
| Error skip-game     | ○   | ○     | Sprint 02          |

✓ = exists today, ○ = gap

## Files (primary)

| File                                         | Change                |
| -------------------------------------------- | --------------------- |
| `test/integration/workers.test.ts`           | New                   |
| `src/replay/__tests__/game-replayer.test.ts` | New                   |
| `test/integration/fixtures.test.ts`          | Extend MT cases       |
| `test/README.md`                             | Coverage expectations |

## Done when

- At least one MT test runs in every `npm test` invocation.
- Replay has isolated unit tests (not only E2E).
- Worker hang regression test exists (mock or small fixture).
- Coverage matrix above has no ○ in P0 rows.

## Verification

```bash
npm test
npm run typecheck
```
