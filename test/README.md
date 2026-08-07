# Testing

## Layout

```
src/<module>/__tests__/     Unit tests colocated with the module they cover
test/integration/           End-to-end tests against the built library
test/fixtures/              Small PGN files committed to git
test/corpus/                Large PGN files (gitignored, optional)
test/helpers/               Shared test utilities
```

## Import rules

Never mix `#…` and `chessalyzer` in the same test file.

| Layer                                            | Import the code under test from                                                                         | Notes                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Unit (`src/**/__tests__`)                        | `#…` → source                                                                                           | No `chessalyzer` imports (not even transitively via fixtures). `bun test src` needs no build. |
| Integration (`test/integration`)                 | `chessalyzer` / `chessalyzer/pgn` / `chessalyzer/board` / `chessalyzer/replay` / `chessalyzer/trackers` | Asserts the published package graph. Requires `bun run build` first.                          |
| Shared helpers (`test/helpers`)                  | `#…` for types/shapes; stay package-free at runtime                                                     | Helpers assert shapes, not package exports.                                                   |
| Package-contract fixtures (`test/fixtures/*.ts`) | `chessalyzer/*`                                                                                         | Models the public custom-tracker MT contract (`workerModule`, etc.). Integration only.        |
| Manual release (`manual-tests/test-release*.ts`) | `chessalyzer`                                                                                           | Smoke against the built package.                                                              |
| Manual dev (`manual-tests/test-dev.ts`)          | `#…`                                                                                                    | Local source smoke without a build.                                                           |

Use `~/test/…` (tsconfig `paths`) for fixture/helper paths. Prefer `fixturePath(…)` from `~/test/helpers/fixtures` over ad-hoc relative paths.

### Non-obvious choices

- **Custom tracker fixtures are split.** `test/fixtures/custom-game-tracker.ts` uses package imports + `workerModule` (user-facing MT contract). Unit merge tests use `src/core/__tests__/fixtures/merge-game-tracker.ts` on `#` instead — merge logic does not need `workerModule`, and sharing the package fixture would force a build for unit tests.
- **WorkerPool unit tests use stub workers**, not `lib/chess-worker.js`. Pool mechanics (lazy spawn, missing file, `result.error` → reject) are independent of tracker registry; unknown-tracker init is covered in `worker-tracker-registry.test.ts`. Production MT abort / corrupt PGN stay in integration via `analyzePGN`.
- **Lazy spawn vs missing path.** Constructing `WorkerPool` does not touch `filePath`. The unit suite uses a deliberately missing path for the lazy-spawn case, then a separate test that `runTask` fails when the file is missing — so “path unused until spawn” is not confused with “path wrong but green.”

### Colocated unit tests

Module-specific tests live next to the code they exercise (e.g. `src/pgn/__tests__/pgn-chunk.test.ts` tests chunk alignment and parsing). This makes it obvious which source file a failure relates to.

### Integration tests

Tests that run the full `analyzePGN` pipeline stay in `test/integration/` because they span parsing, workers, and trackers — not a single module.

| File                     | Focus                                                                |
| ------------------------ | -------------------------------------------------------------------- |
| `fixtures.test.ts`       | Smoke matrix: every fixture × ST/MT expected game/move counts        |
| `filters.test.ts`        | `filter` / `maxGames` / filter×workers rejection                     |
| `multi-run.test.ts`      | Multi-run orchestration + volume via repeated fixtures               |
| `trackers.test.ts`       | Tracker smokes + tileTracker golden (`en-passant`)                   |
| `parse-pgn.test.ts`      | `chessalyzer/pgn` `parsePGN` / `streamParsePGN`, fixture move counts |
| `workers.test.ts`        | MT `analyzePGN` abort / corrupt trailing game                        |
| `custom-tracker.test.ts` | Custom tracker + `workerModule` in MT mode                           |
| `error-policy.test.ts`   | `onError: 'abort'` / `'skip-game'` (incl. `skippedGames`)            |
| `exports.test.ts`        | `chessalyzer/board` subpath and `replay` option on `analyzePGN`      |
| `corpus.test.ts`         | Optional large-file golden regression                                |

### Fixtures vs corpus

|          | Fixtures                  | Corpus                     |
| -------- | ------------------------- | -------------------------- |
| Location | `test/fixtures/`          | `test/corpus/`             |
| In git   | yes                       | no                         |
| CI       | always runs               | skipped without local file |
| Purpose  | format/edge-case coverage | golden regression at scale |

Corpus tests use `describe.skip` when `test/corpus/asorted-games.pgn` is missing locally.

## Coverage matrix

| Area                                 | Single-threaded | Multithreaded | Where                                        |
| ------------------------------------ | --------------- | ------------- | -------------------------------------------- |
| Public `parsePGN` / `streamParsePGN` | yes             | —             | `parse-pgn.test.ts`                          |
| Basic parse counts                   | yes             | yes           | `fixtures.test.ts`, `corpus.test.ts`         |
| Filter / maxGames                    | yes             | yes           | `filters.test.ts`, `corpus.test.ts`          |
| Multi-run                            | yes             | yes           | `multi-run.test.ts`                          |
| gameTracker golden                   | yes             | yes           | `corpus.test.ts` (corpus only)               |
| pieceTracker golden                  | yes             | yes           | `corpus.test.ts` (corpus only)               |
| tileTracker golden                   | yes             | yes           | `trackers.test.ts` (`en-passant.pgn`)        |
| Custom tracker MT                    | —               | yes           | `custom-tracker.test.ts` (incl. filter path) |
| Replay unit                          | yes             | —             | `src/replay/__tests__/game-replayer.test.ts` |
| Error skip-game                      | yes             | yes           | `error-policy.test.ts`                       |
| Error abort                          | yes             | yes           | `error-policy.test.ts`, `workers.test.ts`    |
| WorkerPool unit                      | —               | —             | `src/core/__tests__/worker-pool.test.ts`     |
| Tracker merge unit                   | —               | —             | `src/core/__tests__/tracker-merge.test.ts`   |

**Corpus-only gaps:** gameTracker ECO totals, pieceTracker heatmaps, and large-scale filter counts require `test/corpus/asorted-games.pgn`.

## Commands

```sh
bun run test:unit            # src/** only — no build required
bun run build && bun run test:integration   # built package contract
bun run build && bun test    # full suite (CI: setup builds, then bun test)
bun run test:build-fixtures  # merge-update manifest after fixture changes (preserves golden)
```

`test:build-fixtures` re-analyzes each `test/fixtures/*.pgn` (no trackers) and updates `expected` game/move counts. It preserves `golden` blocks and descriptions. Replay skip / `onError` behavior is covered in `error-policy.test.ts`, not the fixture manifest.

CI (`.github/workflows/ci.yml`) runs `bun run build` then `bun test`. Corpus tests are included in `bun test` but skip when the local corpus file is absent.

## Optional local checks

- **Perf regression:** `bun run bench:perf` when a large PGN is available under `pgn/` (not run in default CI)
