# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.0.0-beta.0] - 2026-08-04

First beta release. Only minor planned API changes, if at all.

### Added

- **`ReplayMode`** exported from `chessalyzer` (closed union `'skip' | 'board' | 'actions'`).
- **Analysis types on the root entry:** `AnalyzeRun`, `AnalyzeRunResult`, `GameFilter`, `WorkerOptions`.
- **`TrackerInstance`** exported from `chessalyzer/trackers` for typing tracker arrays.
- **`tileAt(tiles, square)`** on `chessalyzer/trackers` — square-based tile grid access (avoids raw `[row][col]` indexing under `noUncheckedIndexedAccess`).
- **`HeatmapFn`** exported from `chessalyzer/trackers`; `Action` dual-exported from `/trackers` so move-tracker authors can use one import path.
- **`isStartingPieceName()`** on `chessalyzer/board` and `chessalyzer/trackers`.
- **`workers: number`** shorthand on `AnalyzeOptions` (equivalent to `{ count: n }`).
- **`heatmapToString(data)`** on `chessalyzer/trackers` — ANSI string form of `printHeatmap` for tests and piping.
- **JSDoc pass** on public APIs: user-facing descriptions, field docs on exported types, `@example` on main entry points (`analyzePGN`, `parsePGN`, `streamParsePGN`, tracker factories, heatmap helpers), and removal of internal-only wording from shipped `.d.ts` comments.

### Changed

- **`ReplayMode` (breaking):** no longer an open union — only `'skip' | 'board' | 'actions'` type-check.
- **Piece-name types (breaking):** `Piece` → `StartingPieceName`, `BoardPieceName` → `PieceName`; `isTrackedPiece` → `isStartingPieceName`.
- **Heatmap callback API (breaking):** `HeatmapAnalysisFunc` → `HeatmapFn`, and its argument object is now flat — `({ data, square, startingPiece })` where `square` is a `Square` and `startingPiece` is `HeatmapPieceRef | null`. Replaces the nested `loopSquare: SquareData` wrapper, so `square.square` / `square.piece` become `square` / `startingPiece`. `startingPiece.name` is `StartingPieceName`, so presets need no runtime guard.
- **`TileStats` fields (breaking):** `wasOn` → `occupiedFor`, `capturedOn` → `captures`, `wasCapturedOn` → `losses`.
- **`ColorBucket` → `TileColorStats`** (breaking).
- **`GameTrackerState` (breaking):** `games` → `gameCount`, `ECO` → `eco`.
- **`WorkerOptions` (breaking):** `workerCount` → `count`.
- **`ParsePgnOptions` → `ParsePGNOptions`** (breaking).
- **`coordsToSquare`** now takes `BoardCoord` (inverse of `squareToCoords`); two-arg `(row, col)` removed from the public API (internal hot path uses `squareAt`).
- **`printHeatmap`** moved from `chessalyzer` to `chessalyzer/trackers`.
- **`TileTracker` `onFinish`:** strips runtime scratch fields (`currentPiece` on cells, `movesGame` on state) so `tiles.state` matches the public `TileTrackerState` shape after analysis.
- **Filters infer `headers`:** a `filter` callback enables tag-pair parsing automatically; `headers: false` throws when a filter or game tracker needs headers.
- **Abort errors:** thrown replay failures copy `code` / `gameIndex` / `moveIndex` / `san` / `reason` onto the error — `isReplayError(err)` works directly in `catch` blocks (`getAnalyzeError` still available).
- **`MoveAction.piece` and capture piece fields** are non-null `PieceName` after a successful SAN decode (promoted names included). Replay now enforces this: a SAN whose origin or capture target resolves to an empty square fails as an `IllegalMove` replay error instead of decoding an action with `null` piece fields. Previously such games surfaced an internal `TypeError` message and could hand `null` to move trackers when `onError: 'skip-game'` was set.
- **`printHeatmap`** delegates to `heatmapToString` internally.

### Removed

- **`algebraicToCoords`** from `chessalyzer/board` (still available internally; use `squareToCoords` for known `Square` values).
- **`BaseAction`** from `chessalyzer/replay` (use `Action` or the specific variant types).
- **Internal tile grid types out of the public `.d.ts`:** `tileAt` no longer carries a `RuntimeTileGrid` overload, so `RuntimeTileGrid`, `StatsField`, and `TilePiece` no longer appear in the shipped `chessalyzer/trackers` types. `tileAt(tiles: TileGrid, square)` is the single public signature.
- **`HeatmapSquare`** — the wrapper was flattened into the `HeatmapFn` argument object; use `square` and `startingPiece` directly, and `HeatmapPieceRef` to name the piece shape.

### Migration

```ts
// piece names
import type { StartingPieceName, PieceName } from 'chessalyzer/board';
import { isStartingPieceName } from 'chessalyzer/trackers';

// heatmaps — flat callback args: square is a Square, startingPiece replaces square.piece
import { generateHeatmap, HeatmapFn, tileAt, printHeatmap } from 'chessalyzer/trackers';
generateHeatmap(tiles.state, ({ data, square }) => {
    const cell = tileAt(data.tiles, square);
    return cell?.w.total.occupiedFor ?? 0;
});

// game tracker state
console.log(games.state.gameCount, games.state.eco);

// workers
await analyzePGN(path, { trackers: [tiles], workers: 8 });
// or: workers: { count: 8, chunk: { targetBytes: 4 * 1024 * 1024 } }

// analysis types
import type {
    AnalyzeRun,
    AnalyzeRunResult,
    GameFilter,
    ReplayMode,
    WorkerOptions,
} from 'chessalyzer';
```

## [4.0.0-alpha.4] - 2026-08-03

### Added

- **`chessalyzer/board`** — `Square`, `BoardCoord`, piece-name types (`Piece`, `BoardPieceName`, `PromotedPieceName`), `PlayerColor`, coord helpers (`squareToCoords`, `coordsToSquare`, `algebraicToCoords`), and `isPromotedPieceName()`.

### Changed

- **Subpath export scope (breaking):** Each public subpath now exports only concepts its module owns. `chessalyzer/replay` is action types only (`Action`, …). Board coords and piece identity moved to `chessalyzer/board`. `HeatmapData` is available from `chessalyzer/trackers` only (not the root entry). `ReplayMode` is no longer a public export — set `replay: 'skip' | 'board' | 'actions'` inline on `AnalyzeOptions`, or use `NonNullable<AnalyzeOptions['replay']>` as a type alias.

```ts
// before
import type { Action, Square } from 'chessalyzer/replay';
import { squareToCoords } from 'chessalyzer/replay';
import type { HeatmapData, ReplayMode } from 'chessalyzer';

// after
import type { Action } from 'chessalyzer/replay';
import type { Square } from 'chessalyzer/board';
import { squareToCoords } from 'chessalyzer/board';
import type { HeatmapData } from 'chessalyzer/trackers';
// ReplayMode: use AnalyzeOptions['replay'] or literal 'board' | 'skip' | 'actions'
```

- **Per-run error fields** — `AnalyzeRunResult.skippedGames` and `AnalyzeRunResult.errors` when `onError: 'skip-game'` (call-level totals unchanged).
- **Piece identity on replay actions** — `BoardPieceName`, `PromotedPieceName`, and `isPromotedPieceName()`; `MoveAction.piece` and capture fields use `BoardPieceName | null` instead of `string | null`. Exported from `chessalyzer/board` and `chessalyzer/trackers`.
- **Built-in state sub-shapes** on `/trackers` — `TileStats`, `ColorBucket`, `TileCell`, `TileGrid`, `PieceStatsMap`.
- **`HeatmapData`** on `chessalyzer/trackers` (use with `generateHeatmap` / `printHeatmap`).

### Changed

- **Tracker API (breaking):** Built-ins are camelCase factories — `tileTracker()`, `pieceTracker()`, `gameTracker()` — that return `TrackerInstance` handles. Pass instances to `analyzePGN`; read accumulated stats from `instance.state` (typed). Multi-run cohorts need distinct instances. `defineGameTracker` / `defineMoveTracker` return a factory; default-export that factory for MT. Options are passed to the factory call (`myTracker({ minElo: 2000 })`), not stored on the definition — workers import the factory and call it with those options. Worker merge snapshots are keyed by run-local **index** (`TrackerSnapshot { index, state }`), so two instances of the same tracker id in one run merge correctly. The same instance may accumulate across separate `analyzePGN` calls; reusing it twice in one call (or while another call is in flight) throws.
- **`AnalyzeOptions` (breaking):** Discriminated threading union — `filter` requires `workers: false`; cannot combine `runs` with top-level `trackers` / `filter` / `maxGames`; `runs` must be non-empty. `replay` and `headers` are inferred from tracker instances where possible (`move` trackers require `replay: 'actions'`; game trackers require headers). `merge` is required on custom tracker definitions.
- **Open union types:** `AnalyzeError.code`, `ReplayErrorReason`, and `ReplayMode` use `OpenUnion<T>` (`T | (string & {})`) so future literal values type-check without forcing `string`.
- **Export hygiene:** `WorkerChunkOptions` replaces the internal `PgnChunkConfig` leak in public `.d.ts` files; runtime helpers moved out of `src/types/` (`toParsedGame`, `isGameResult`, `resolveStandaloneParseOptions` → `#pgn/`).
- **Single-threaded filters:** `toParsedGame` is materialized at most once per game and shared across filtered runs and game trackers in the same pass (~14% faster on multi-run filtered ST benchmarks).
- **Heatmaps:** Scoped presets are factories — e.g. `TileHeatmapPresets.PIECE_MOVED_TO_TILE({ color: 'w', name: 'Qd' })` and `TILE_OCC_BY_PIECE('e4')` — instead of passing `{ square }` to `generateHeatmap`. Piece-scoped presets take a `HeatmapPieceRef` (`{ color, name }` with starting-piece names like `Qd`, `Nb`, `Pa`). Dropped `GenerateHeatmapOptions` and `refSquare` from `HeatmapAnalysisArgs`; close over scope in custom functions.

### Removed

- **`getTrackerState`** — use `instance.state` on the handle you created.
- **`AnalyzeTrackerResult`** — replaced by `TrackerInstance` (internal; not a public export).
- **`AnalyzeRunResult.trackers`** — result runs hold per-cohort `gameCount` / `moveCount` only; tracker state lives on the instances you passed in.
- **PascalCase built-in exports** `TileTracker` / `PieceTracker` / `GameTracker` — use `tileTracker` / `pieceTracker` / `gameTracker` and call them.
- Passing bare definitions / singletons to `analyzePGN` — must call the factory first.
- Public type exports trimmed: dropped `StateOf`, `TrackerDef` / `MoveTrackerDef` / `GameTrackerDef`, `TrackerFactory` / `TrackerInstance`, `HeatmapAnalysisArgs`, `SquareData`, `GameFilter`, `AnalyzeRun`, `AnalyzeRunResult`, and `WorkerOptions` from the package entry points (still used internally; prefer `AnalyzeOptions` / `AnalyzeResult` and built-in `*TrackerState` types).

### Migration

```ts
// before
import { TileTracker, generateHeatmap, TileHeatmapPresets } from 'chessalyzer/trackers';
const result = await analyzePGN(path, { trackers: [TileTracker] });
const { state } = result.runs[0].trackers[0];
// or: getTrackerState(result, TileTracker)

// after
import { tileTracker, generateHeatmap, TileHeatmapPresets } from 'chessalyzer/trackers';
const tiles = tileTracker();
await analyzePGN(path, { trackers: [tiles] });
generateHeatmap(tiles.state, TileHeatmapPresets.TILE_OCC_ALL);
```

Custom trackers: default-export the factory; pass options at call time:

```ts
export default defineGameTracker({ id: 'MyTracker', workerModule: import.meta.url, init: (options?) => ({ ... }), track, merge });
const t = myTracker({ minElo: 2000 });
```

## [4.0.0-alpha.3] - 2026-08-02

### Changed

- **Heatmaps:** `generateHeatmap` / `generateComparisonHeatmap` take an analysis function directly (e.g. `TileHeatmapPresets.TILE_OCC_ALL` or a custom `HeatmapAnalysisFunc`). The preset map is no longer a separate argument; options are only `{ square? }` (`Square`, not `BoardCoord`).
- **`TileTrackerState`:** public type is only `{ tiles, movesTotal }` (no `movesGame` / `currentPiece`). Virtual occupants are plain objects, not a `TilePiece` class.

### Removed

- **Heatmaps:** `generateHeatmap` / `generateComparisonHeatmap`: Dropped `optData` — close over outer scope instead. Removed `TileHeatmapPresetName` / `PieceHeatmapPresetName`.
- **Custom trackers:**: Dropped class-based custom tracker. Multithreaded modules must default-export a definition object (`defineGameTracker` / `defineMoveTracker`).

## [4.0.0-alpha.2] - 2026-08-01

### Changed

- **Tracker redesign:** trackers are now **definitions + plain state**. Pass a tracker definition to `analyzePGN` (`defineGameTracker` / `defineMoveTracker` factories, or class adapters extending `BaseMoveTracker` / `BaseGameTracker`). Stats are returned in `result.trackers[m].state` (single-run) or `result.runs[n].trackers[m].state` (multi-run) — not mutated in place on the definition.
- **Result shape:** single-run `analyzePGN` returns flat `result.trackers`; multi-run keeps `result.runs`. New `getTrackerState(result, def)` helper looks up state by definition identity.
- **Multithreaded contract:** `id`, `init()`, `track(state, …)`, `merge(state, other)`, and `workerModule` (custom trackers). Worker payloads are `TrackerSnapshot { id, state }` merged by id at pool drain. Optional `options` on the definition are cloned to workers before `init()`.
- **Heatmaps:** `generateHeatmap(state, { analysis, square?, optData? })` and `generateComparisonHeatmap(state, otherState, { analysis, square?, optData? })`. `HeatmapAnalysisFunc` takes a single args object (`data`, `loopSquare`, `refSquare`, `optData?`).
- **`MoveTracker` renamed to `BaseMoveTracker`** (aligns with `BaseGameTracker`).
- **`chessalyzer/replay` exports:** `BoardCoord`, `squareToCoords`, `coordsToSquare`, `algebraicToCoords`.
- Lifecycle hook renamed to **`onFinish(state)`** (symmetric with `onGameEnd`).

### Removed

- `BaseTracker`, `Tracker` / `*Contract` types, `static trackerId`, `trackMoves` / `trackGame` method names on bases (use `track(state, …)`), in-place mutation of tracker instances after analysis.
- Removed dead profiling plumbing (`TrackerConfig`, `cfg` threading, `time` merge).

## [4.0.0-alpha.1] - 2026-07-31

### Changed

- Dropped the `chalk` dependency; `printHeatmap` uses ANSI truecolor escapes instead (zero production dependencies).

### Removed

- Removed `chessalyzer/io` and other internal-only symbols (board coord helpers, tile/piece internals, `MAX_COLLECTED_ERRORS`, etc.). Subpaths are now `chessalyzer`, `/pgn`, `/replay` (types), and `/trackers`.

## [4.0.0-alpha.0] - 2026-07-30

Version 4 is a complete redesign: a simpler API, faster runs, and imports that match how you actually use the library.

### Highlights

- **`analyzePGN`** replaces the static `Chessalyzer` class and is directly exported via the main entry point.
- New parse-only API: **`parsePGN` and `streamParsePGN`** on `chessalyzer/pgn` when you only need the games (headers and SAN strings) without running trackers.
- **Subpath imports** — `chessalyzer/pgn`, `/trackers`, `/io`, `/replay` — so you pull in only what you need.
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
- Import built-in trackers by name from `chessalyzer/trackers` (`GameTracker`, `PieceTracker`, `TileTracker`). Base classes and types live there too.
- `parsePGN` moved to `chessalyzer/pgn`; the root package export is analyze-only. Parsed moves are now `{ san }` objects rather than bare strings.
- If you read action coordinates in a move tracker, expect algebraic squares (`'e1'`, `'e4'`, …) on `from` / `to` / `on`, plus optional `castle` / `enPassant` flags.
- A few renames and tidy-ups: the tile helper is `MoveCoords` (was `Move`), `GameResult` is a union type, and `errorsTruncated` is a boolean. Handy types also ship from the root, `/trackers`, and `/replay` — see the README.
- Removed deprecated `workers.batchSize` option.

### Under the hood

- Internals reorganized into `io`, `pgn`, `replay`, and `trackers` modules with consistent pipeline terminology (I/O → PGN parse → replay → analyze). See the [README Pipeline section](./README.md#pipeline).
- Multithreaded `filter` and `maxGames` share the worker-chunk path; JavaScript `filter` callbacks still run on the main thread.
- The analyze hot path still keeps movetext as plain strings internally and only builds `{ san }` objects at public boundaries (parse APIs, filters, game trackers).

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
