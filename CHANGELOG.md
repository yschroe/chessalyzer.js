# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Do not reset board state after games in 'skip' `replaymode` for increased performance.
- Completed games take over their parsed headers object instead of copying it (about 3% faster single-threaded analysis when headers are parsed).
- Faster multithreaded analysis: the main thread now splits the PGN into worker chunks on raw bytes instead of decoding every line (about 40% faster in `'skip'` mode, about 13% in `'board'` mode on a large Lichess export). `workers.chunk.targetBytes` now counts UTF-8 bytes and defaults to 2.5 MiB. `workers.chunk.maxLines` / `minLines` no longer have a default cap; setting either one makes chunking count lines, which is slower.

## [4.0.0] - 2026-08-09

Version 4 is a partial rewrite of the library with many improvements. The update focused on cleaning up the public API, make the analysis pipeline faster on large files, and write documentation that walks you from initial setup to implementing your own custom trackers with clear examples.

### Highlights

- **`analyzePGN`** replaces the static `Chessalyzer` class, with all options living in one plain object.
- **Subpath imports** — `chessalyzer/pgn`, `/trackers`, `/board`, `/replay` — so you only pull in what you actually use.
- **Tracker factories** — `tileTracker()`, `pieceTracker()`, `gameTracker()` give you instances; read the results off `instance.state` once analysis is done.
- **A parse-only mode** — `parsePGN` / `streamParsePGN` for when you just want the games (headers + SAN) without running any trackers.
- **Smarter replay** — modes `'skip' | 'board' | 'actions'` are inferred from your trackers, so parse-only runs skip board replay entirely.
- **Workers on by default**, tunable with `workers: n` or `{ count, chunk }`; multi-run analyses parse each chunk of the file only once.
- **A real docs site** — https://yschroe.github.io/chessalyzer/
- **Zero production dependencies** — `chalk` is gone; `printHeatmap` draws its own colors.

### Added

- **`parsePGN` / `streamParsePGN`** on `chessalyzer/pgn` — parse a PGN file into games without touching the board or running any trackers.
- **`chessalyzer/board`** — `Square`, `BoardCoord`, `StartingPieceName` / `PieceName`, coordinate helpers, `isStartingPieceName()`.
- **A friendlier error policy** — analysis still aborts on the first bad game by default, but `onError: 'skip-game'` now lets it keep going and hand back a capped summary (`errors`, `errorsTruncated`, `skippedGames`, plus `isReplayError` / `getAnalyzeError` for easy checks).
- **`MoveCoords`** on `chessalyzer/replay` and `chessalyzer/trackers` — the `{ from, to }` pair shared by `MoveAction` and custom move trackers.
- **JSDoc everywhere** — public APIs now come with real descriptions and `@example`s, not just types.
- **Analysis types on the root entry** (`AnalyzeRun`, `AnalyzeRunResult`, `GameFilter`, `ReplayMode`, `WorkerOptions`) and **`TrackerInstance`** from `chessalyzer/trackers` for typing tracker arrays.

### Changed

- **Package rename (breaking):** `chessalyzer.js` → **`chessalyzer`**. Requires Node.js ≥ 22 (or Bun).
- **Entry point (breaking):** `Chessalyzer.analyzePGN(...)` → `analyzePGN(...)` from `chessalyzer`; single-threaded mode is now `{ workers: false }` instead of a `null` third argument.
- **Custom trackers, reworked (breaking):** no more extending `BaseTracker` — write a definition with `defineGameTracker` / `defineMoveTracker` (plain, cloneable state plus `init` / `track` / `merge`), then call it to get an instance. Built-ins follow the same pattern: `tileTracker()`, `pieceTracker()`, `gameTracker()` replace the old `TileTracker` / `PieceTracker` / `GameTracker` classes.
- **Results, reworked (breaking):** tracker stats live on the instances you passed in (`instance.state`), not on the result object. `AnalyzeResult` only carries per-run counts and timing (`result.perf.durationMs`, `result.perf.movesPerSecond`).
- **Heatmaps, reworked (breaking):** `generateHeatmap` / `generateComparisonHeatmap` take a `HeatmapFn` directly, with flat callback args (`{ data, square, startingPiece }`); scoped presets are factories (e.g. `TILE_OCC_BY_PIECE('e4')`); the data matrix is `HeatmapData.grid` (was `map`); `printHeatmap` moved to `chessalyzer/trackers`.
- **Filters & comparisons, reworked (breaking):** pass `runs: [...]` instead of an array of configs; a JavaScript `filter` implies single-threaded analysis when `workers` is omitted, and combining a filter with an explicit worker pool is now a type and runtime error.
- **`TileTrackerState` (breaking):** the `tiles` 8×8 grid is now **`squares: Record<Square, SquareStats>`** — read `state.squares['e4']` directly. Field renames: `wasOn` → `occupiedFor`, `capturedOn` → `captures`, `wasCapturedOn` → `losses`.
- **`GameTrackerState` (breaking):** `cntGames` → **`gameCount`**; `ECO` → **`eco`**.
- **Replay actions (breaking):** squares are algebraic (`'e4'`) instead of coordinate pairs, with `castle` / `enPassant` flags; `type: 'promote'` → **`'promotion'`**.
- **Piece-name types (breaking):** `Piece` → `StartingPieceName`, `BoardPieceName` → `PieceName`.
- **`workers.batchSize` → `workers: { count, chunk }`** (breaking); shorthand **`workers: n`** also works.

### Removed

- **`Chessalyzer` class** and class-based custom trackers (`BaseTracker`) — see the tracker rework above.
- **`chalk`** as a dependency.
- **`workers.batchSize`** and the `null` single-threaded flag — see `workers` above.

### Migration

```ts
// v3
import { Chessalyzer, TileTracker } from 'chessalyzer.js';
const t = new TileTracker();
await Chessalyzer.analyzePGN(path, { trackers: [t] });

// v4
import { analyzePGN } from 'chessalyzer';
import { tileTracker, generateHeatmap, TileHeatmapPresets } from 'chessalyzer/trackers';

const tiles = tileTracker();
await analyzePGN(path, { trackers: [tiles] });
const cell = tiles.state.squares['f7'];
generateHeatmap(tiles.state, TileHeatmapPresets.TILE_OCC_ALL);
```

Custom trackers: default-export the factory; pass options at call time:

```ts
export default defineGameTracker({
    id: 'MyTracker',
    workerModule: import.meta.url,
    init: (options?) => ({ ... }),
    track,
    merge,
});
const t = myTracker({ minElo: 2000 });
```

Full guides: https://yschroe.github.io/chessalyzer/

### Under the hood

A few internal changes worth knowing about if you're curious where the speed comes from:

- The pipeline is now organized into clear `io` → `pgn` → `replay` → analyze stages with consistent naming throughout.
- In multithreaded mode, the main thread chunks the file into transferable UTF-8 byte ranges; workers handle parsing, replay, and tracking themselves, and only report state back once the pool drains.
- The hot path still passes moves around as plain SAN strings internally; `{ san }` objects only get built at public boundaries (parse APIs, filters, game trackers) to avoid unnecessary allocations.
- Parse-only and trackerless runs skip board replay entirely for better performance, and single-threaded filtered multi-run analyses now share one parsed copy of each game across runs.

## [3.0.6] - 2024-03-17

### Changed

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

- The count of additional needed threads in multithreaded mode is now determined dynamically. Instead of starting a new thread every time new games have been read in, chessalyzer now tries to reuse already started threads. This removes the overhead of needing to create a new worker thread every time, which results in a huge performance boost (around +25%).

### Removed

- As a result `nThreads` in the multithread config argument of `Chessalyzer.analyzePGN(...)` is now deprecated and is no longer used.

## [2.0.0] - 2021-12-20

### Added

- Added support for PGN files in which the game moves are listed in multiple lines instead of one single line
- You can now run different filters in parallel. For example you could configure chessalyzer in a way that Tracker1 tracks only PlayerA's games and Tracker2 tracks only PlayerB's games during the same run of analyzePGN(...). Before you needed to start two separate analyses with the different Trackers and filter settings.

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
- Changed import scheme from `const Chessalyzer = require('chessalyzer');` to `const { Chessalyzer, Tracker} = require('chessalyzer');`.

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

- Moved the worker-thread logic into a separate file instead of cloning the entire process for multi threading. This should make it easier to include chessalyzer in other projects, for example a REST server. Prior this change with active multithreading every time a new worker thread was created the whole server was cloned.

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
