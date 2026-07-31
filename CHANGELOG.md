# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Dropped the `chalk` dependency; `printHeatmap` uses ANSI truecolor escapes instead (zero production dependencies).

## [4.0.0-alpha.0] - 2026-07-30

Version 4 is a complete redesign: a simpler API, faster runs, and imports that match how you actually use the library.

### Highlights

- **`analyzePGN`** replaces the static `Chessalyzer` class and is directly exported via the main entry point.
- New parse-only API: **`parsePGN` and `streamParsePGN`** on `chessalyzer.js/pgn` when you only need the games (headers and SAN strings) without running trackers.
- **Subpath imports** — `chessalyzer.js/pgn`, `/trackers`, `/io`, `/replay` — so you pull in only what you need.
- **Friendlier data shapes** — parsed moves arrive as simple `{ san }` objects (with room to grow later), and board actions use readable squares like `'e4'` instead of numeric indices. Castling and en passant are marked clearly when they happen.
- **Leaner trackers** — the `Tracker` contract stays small (`track`, optional hooks, `merge`); heatmaps and profiling live on `BaseTracker` if you need them.
- **Faster by default** — parse-only and trackerless runs skip board replay (~10% on large files), workers start lazily, and multi-run analyses parse each chunk once instead of re-reading the file.
- **`TileTracker`** now counts castling as one move.
- **Replay errors** — abort on the first bad game by default; use `onError: 'skip-game'` to keep going and collect a summary (handy for big PGN dumps).

### Upgrading from v3

- Import `analyzePGN` (and `printHeatmap`) directly instead of `Chessalyzer.analyzePGN(...)`.
- Pass all options in one object: `analyzePGN(path, { trackers, filter, maxGames, runs, workers })`.
- For single-threaded mode, use `{ workers: false }` instead of passing `null` as a third argument.
- Results use the unified `AnalyzeResult` shape: `gameCount`, `moveCount`, `movesPerSecond`, `runs`, `durationMs`.
- Compare multiple analyses with `runs: [...]` instead of passing an array of configs.
- Custom trackers: rename `add()` to `merge()`, and for multithreading add `static trackerId` and `static workerModule = import.meta.url`. The tracker interface itself is slimmer now — heatmaps stay on `BaseTracker`.
- Tracker stats renamed for consistency: `GameTracker.cntGames` → `games`; `TileTracker.cntMovesGame` / `cntMovesTotal` → `movesGame` / `movesTotal`.
- Import built-in trackers by name from `chessalyzer.js/trackers` (`GameTracker`, `PieceTracker`, `TileTracker`). Base classes and types live there too.
- `parsePGN` moved to `chessalyzer.js/pgn`; the root package export is analyze-only. Parsed moves are now `{ san }` objects rather than bare strings.
- If you read action coordinates in a move tracker, expect algebraic squares (`'e1'`, `'e4'`, …) on `from` / `to` / `on`, plus optional `castle` / `enPassant` flags.
- A few renames and tidy-ups: the tile helper is `MoveCoords` (was `Move`), `GameResult` is a union type, and `errorsTruncated` is a boolean. Handy types also ship from the root, `/trackers`, and `/replay` — see the README.
- Removed deprecated `workers.batchSize` option.

### Under the hood

- Internals reorganized into `io`, `pgn`, `replay`, and `trackers` modules with consistent pipeline terminology (I/O → PGN parse → replay → analyze). See the [README Pipeline section](./README.md#pipeline).
- Multithreaded `filter` and `maxGames` share the worker-chunk path; JavaScript `filter` callbacks still run on the main thread.
- The analyze hot path still keeps movetext as plain strings internally and only builds `{ san }` objects at public boundaries (parse APIs, filters, game trackers).

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
