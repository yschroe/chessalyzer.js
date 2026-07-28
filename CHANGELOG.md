# Changelog

## [Unreleased]

### Breaking changes (v4)

- Replace static `Chessalyzer` class with module functions `analyzePGN` and `printHeatmap`.
- Single options object: `analyzePGN(path, { trackers, filter, maxGames, runs, workers })`.
- Single-threaded mode: `{ workers: false }` instead of passing `null` as a third argument.
- Unified return type `AnalyzeResult` (`games`, `moves`, `movesPerSecond`, `runs`, `durationMs`).
- Multi-run analyses via `runs: [...]` instead of passing an array of configs.
- Tracker `add()` renamed to `merge()`; custom MT trackers use `static workerModule = import.meta.url` and `static trackerId`.
- Export `MoveTracker`, `GameTrackerBase`, and public config/result types.
- Built-in tracker stats aligned with `AnalyzeResult`: `GameTracker.cntGames` → `games`; `TileTracker.cntMovesGame` / `cntMovesTotal` → `movesGame` / `movesTotal`.
- Tracker modules renamed: `game-tracker.ts`, `piece-tracker.ts`, `tile/tile-tracker.ts` (drop misleading `-base` suffix on concrete exports).

#### Pipeline terminology (Sprint 11)

Docs and benchmarks use industry-aligned stage names: **I/O → PGN parse → replay → analyze**. See [README Pipeline section](./README.md#pipeline) and [Sprint 11](sprints/sprint-11-pipeline-terminology.md).

**Applied in Phase 2 (internal renames):**

- `movetext-tokenizer.ts` → `movetext.ts`
- `readInHeader` → `parseHeaders` (`ParseGamesOptions`, worker tasks, `GameProcessor`)
- `parseOnly` (worker) → `pgnParseOnly`

**Planned (Phase 3+):**

| Pre-sprint / legacy     | v4 target                | Sprint phase |
| ----------------------- | ------------------------ | ------------ |
| `ReplayPolicy 'none'`   | `ReplayMode 'board'`     | Phase 3      |
| `SanToActions.parse()`  | `SanDecoder.decodeSan()` | Phase 3      |
| Public `headers` option | alias for `parseHeaders` | Phase 4      |

### Changes

- Worker pool spawns threads lazily on first task (up to configured `workerCount`).
- Tracker config is sent once per worker via `workerData`, not per batch.
- Multithreaded `filter` / `maxGames` use the worker-chunk path (single parse per chunk; no PGN re-encode). JS `filter` functions replay on the main thread.
- Removed deprecated `workers.batchSize` option (legacy re-encode path).
- Count-only runs (no move trackers) skip board replay by default (~10% throughput on large fixtures; Node, M-series, 2× Lichess 2014-09). Set `SKIP_REPLAY_WITHOUT_MOVE_TRACKERS = false` in `replay-policy.ts` to always replay SAN.
- Internal processor counters aligned with public `maxGames` naming; `@internal` types moved to `analysis-runtime.ts`.
- `TileTracker` counts castling as one move (rook leg excluded from move counter).

### Ideas

- Do not send result back to main thread every time a chunk was processed, but only once at the end.

## [3.0.6] - 2024-03-17

### Changes

- Internal: Switched to typed arrays for storing the board state. Boosts performance by around 5-10%.

## [3.0.5] - 2023-07-02

### Fixed

- Further optimized PGN parsing.

## [3.0.4] - 2023-07-01

### Fixed

- Fixed comments like `{ (0.00 → -0.67) Inaccuracy. h5 was best. }` in the PGN file breaking the parser.

## [3.0.3] - 2023-07-01

### Fixed

- Optimized PGN parsing Regexes. Results in another 15% performance boost.

## [3.0.2] - 2023-06-25

### Changed

- Removed unused files from the package.

## [3.0.1] - 2023-06-25

### Changed

- Made package importable in non-ESM environments. Running processPGN(...) still requires ESM.

## [3.0.0] - 2023-05-31

### Changed

- Restructured the return value of the move parser. Now an array of different `Action` types is returned to easier differentiate between actions like 'Move' or 'Capture'. Previously all possible actions were included in the single `MoveData` object. Your custom move trackers will need to be adapted.
- Built-in trackers must now be imported separately (`TileTracker`, `PieceTracker`, `GameTracker`) instead of importing just the `Tracker` object.
- Switched from the `Cluster` to the `Worker Thread` module for multithreading which results in a big performance boost.
- Streamlined naming schema of variables. Variables which contained `kill` or `takes` before, are now called `capture`.
- Various other performance improvements and code simplifications.

## [2.2.0] - 2022-05-29

### Changed

- Build-process only: Removed rollup as a bundler. Code is split up into multiple files and uses import/export statements. Results in a smaller bundle size since the Processor.worker.js does not need to include the whole library anymore.

## [2.1.0] - 2022-05-28

### Changed

- The count of additional needed threads in multithreaded mode is now determined dynamically. Instead of starting a new thread every time new games have been read in, chessalyzer.js now tries to reuse already started threads. This removes the overhead of needing to create a new worker thread every time, which results in a huge performance boost (around +25%).

### Removed

- As a result `nThreads` in the multithread config argument of `Chessalyzer.analyzePGN(...)` is now deprecated and is no longer used.

## [2.0.0] - 2021-12-20

### Added

- Added support for PGN files in which the game moves are listed in multiple lines instead of one single line
- You can now run different filters in parallel. For example you could configure chessalyzer.js in a way that Tracker1 tracks only PlayerA's games and Tracker2 tracks only PlayerB's games during the same run of analyzePGN(...). Before you needed to start two separate analyses with the different Trackers and filter settings.

### Changed

- Chessalyzer.js is now an ES module (ESM). See [this guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c#file-esm-package-md) for how to use this package.
- runBatch(...) and runBatchMulticore(...) were merged into the single function analyzePGN(...). Per default the function will run in multithreaded mode, but you can override the config to force singlethreaded mode if it is needed in your environment.
- The heatmap generation functions have been moved into the Tracker objects.
- Changed the data structure of the move data passed into the trackers.
- Ported code base to TypeScript.

## [1.6.4] - xxxx-xx-xx

### Fixed

- Fix d.ts for Tracker constructors.

## [1.6.3] - xxxx-xx-xx

### Added

- Added d.ts files.

## [1.6.2] - xxxx-xx-xx

### Changed

- Shipping the minified versions in the bundle.

## [1.6.1] - xxxx-xx-xx

### Fixed

- Fixed `generateComparisonHeatmap(...)`.

## [1.6.0] - xxxx-xx-xx

### Changed

- Switched from line-by-line package to node.js native readline module. Makes read-in even faster now.
- Changed import scheme from `const Chessalyzer = require('chessalyzer.js');` to `const { Chessalyzer, Tracker} = require('chessalyzer.js');`.

## [1.5.1] - xxxx-xx-xx

### Fixed

- Fixed bug in PGN Parser.

## [1.5.0] - xxxx-xx-xx

### Added

- Added `printHeatmap(...)` function to print a heatmap to the console.
- Interaction with promoted pawns is now tracked.
- Trackers can now have a cfg attribute which is passed to the workers in multicore mode. profilingActive is now cfg.profilingActive for the trackers.

### Changed

- `generateHeatmap(...)` and `generateComparisonHeatmap(...)` now return an object instead of an array.
- Simplified the internal SAN parsing logic by tracking the piece positions at all times. Results in a slight speed increase.

### Fixed

- Fixed Trackers not tracking time in multicore mode.

## [1.4.1] - xxxx-xx-xx

### Changed

- Updated dependencies.

## [1.4.0] - xxxx-xx-xx

### Added

- Added ECO key tracking to the GameTrackerBase class.
- Added optional finish() method that is called on the trackers after all games have been processed.

## [1.3.2] - xxxx-xx-xx

- Fixed bug in the `Tracker.Tile` class. The `cntMovesTotal` property wasn't incremented correctly when using multithreading.

## [1.3.1] - xxxx-xx-xx

### Changed

- Removed unnecessary files from the npm package (like docs, test, etc.).

## [1.3.0] - xxxx-xx-xx

### Changed

- Moved the worker-thread logic into a separate file instead of cloning the entire process for multi threading. This should make it easier to include chessalyzer.js in other projects, for example a REST server. Prior this change with active multithreading every time a new worker thread was created the whole server was cloned.

### Fixed

- Fixed the minified (chessalyzer.min.js) version to not throw unjustified errors, that the Trackers need to include a track() function.

## [1.2.1] - xxxx-xx-xx

### Fixed

- Fixed bug with multithreading and fully read files. The last chunk wasn't processed before.

## [1.2.0] - xxxx-xx-xx

### Changed

- Significantly increased performance for multithreading.

## [1.1.0] - xxxx-xx-xx

### Added

- Added Multithreading.

## [1.0.1] - xxxx-xx-xx

### Added

- The Promise returned by the startBatch function now contains the number of processed games and moves.

### Changed

- Moved the performance tracking for the Trackers into the Tracker.Base class.

## [1.0.0] - xxxx-xx-xx

### Added

- Significantly changed the API to allow for more modularity. If you are already using an older version (<=0.4.0) consider changing your code to adapt to the new API.
