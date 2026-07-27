# Testing

## Layout

```
src/<module>/__tests__/     Unit tests colocated with the module they cover
test/integration/           End-to-end tests against the built library
test/fixtures/              Small PGN files committed to git
test/corpus/                Large PGN files (gitignored, optional)
test/helpers/               Shared test utilities
```

### Colocated unit tests

Module-specific tests live next to the code they exercise (e.g. `src/pgn/__tests__/pgn-chunk.test.ts` tests chunk alignment and parsing). This makes it obvious which source file a failure relates to.

### Integration tests

Tests that run the full `analyzePGN` pipeline stay in `test/integration/` because they span parsing, workers, and trackers — not a single module.

| File                     | Focus                                           |
| ------------------------ | ----------------------------------------------- |
| `fixtures.test.ts`       | Small PGN fixtures, filters, TileTracker golden |
| `workers.test.ts`        | WorkerPool error propagation, MT abort          |
| `custom-tracker.test.ts` | Custom tracker + `workerModule` in MT mode      |
| `error-policy.test.ts`   | `onError: 'abort'` / `'skip-game'`              |
| `corpus.test.ts`         | Optional large-file golden regression           |

### Fixtures vs corpus

|          | Fixtures                  | Corpus                     |
| -------- | ------------------------- | -------------------------- |
| Location | `test/fixtures/`          | `test/corpus/`             |
| In git   | yes                       | no                         |
| CI       | always runs               | skipped without local file |
| Purpose  | format/edge-case coverage | golden regression at scale |

Corpus tests use `describe.skip` when `test/corpus/asorted-games.pgn` is missing locally.

## Coverage matrix

| Area                     | Single-threaded | Multithreaded | Where                                        |
| ------------------------ | --------------- | ------------- | -------------------------------------------- |
| Basic parse counts       | yes             | yes           | `fixtures.test.ts`, `corpus.test.ts`         |
| Filter / maxGames        | yes             | yes           | `fixtures.test.ts`, `corpus.test.ts`         |
| Multi-run                | —               | yes           | `fixtures.test.ts`                           |
| GameTracker golden       | yes             | yes           | `corpus.test.ts` (corpus only)               |
| PieceTracker golden      | yes             | yes           | `corpus.test.ts` (corpus only)               |
| TileTracker golden       | yes             | yes           | `fixtures.test.ts` (`en-passant.pgn`)        |
| Custom tracker MT        | —               | yes           | `custom-tracker.test.ts`                     |
| Replay unit              | yes             | —             | `src/replay/__tests__/game-replayer.test.ts` |
| Error skip-game          | yes             | yes           | `error-policy.test.ts`                       |
| Error abort              | yes             | yes           | `error-policy.test.ts`, `workers.test.ts`    |
| Worker error propagation | —               | yes           | `workers.test.ts`, `tracker-merge.test.ts`   |
| Tracker merge unit       | —               | —             | `src/core/__tests__/tracker-merge.test.ts`   |

**Corpus-only gaps:** GameTracker ECO totals, PieceTracker heatmaps, and large-scale filter counts require `test/corpus/asorted-games.pgn`. TileTracker castling double-count (two move actions per castle) is documented in fixture golden tests.

## Commands

```sh
bun run build                # required before integration tests (CI runs this automatically)
bun test                     # fixtures + unit tests (CI default)
bun run test:build-fixtures  # merge-update manifest after fixture changes (preserves golden)
```

`test:build-fixtures` re-analyzes each `test/fixtures/*.pgn` and updates `expected` counts. It preserves `golden` blocks and uses per-fixture `analyzeOptions` overrides (see `FIXTURE_ANALYZE` in `scripts/build-fixture-manifest.ts`) for error-policy fixtures like `bad-san-mid-file`.

CI (`.github/workflows/ci.yml`) runs `bun run build` then `bun test`. Corpus tests are included in `bun test` but skip when the local corpus file is absent.

## Optional local checks

- **Perf regression:** `npm run bench:perf` when a large PGN is available under `pgn/` (not run in default CI)
