# Agent guide

This document orients coding agents working on **chessalyzer** — a TypeScript library for batch-analyzing chess PGN files.

## Project overview

Chessalyzer.js parses large PGN databases and runs user-defined **trackers** over each game (move-level or game-level statistics). It is designed for throughput on multi-core machines.

**Main entry points:** `analyzePGN(path, options?)` in [`src/core/analyze.ts`](src/core/analyze.ts) (full pipeline); `parsePGN(path, options?)` in [`src/pgn/parse-pgn.ts`](src/pgn/parse-pgn.ts) via `chessalyzer/pgn`; trackers via `chessalyzer/trackers`.

**Public exports:** Keep public barrels lean — each subpath exports only concepts that module owns. [`src/index.ts`](src/index.ts) is the analyze entry (`analyzePGN`, error helpers, `AnalyzeOptions` / `AnalyzeResult`, `ReplayMode`, `GameFilter`, …). [`src/board/index.ts`](src/board/index.ts) → `chessalyzer/board` (coords, piece names). [`src/replay/index.ts`](src/replay/index.ts) → `chessalyzer/replay` (action types only). [`src/pgn/index.ts`](src/pgn/index.ts) and [`src/trackers/index.ts`](src/trackers/index.ts) export their own runtime + types. Do not re-export another module's concepts from the wrong barrel (e.g. board types via `/replay`). [`src/trackers/index.ts`](src/trackers/index.ts) may dual-export piece-name aliases used by tracker APIs (`StartingPieceName`, `isStartingPieceName`). Prefer TypeScript inference for nested option shapes (`AnalyzeRun`, `GameFilter`, …). Do not export internal plumbing (`TrackerDef`, `TrackerFactory`, `ReplayMode` on `/replay`, …). Export `TrackerInstance` from `/trackers` for typing tracker arrays.

**Pipeline (high level):**

1. **I/O** — `readLines` / `openLineStream` in [`src/io/line-reader.ts`](src/io/line-reader.ts) and `readPgnChunks` in [`src/io/pgn-chunks.ts`](src/io/pgn-chunks.ts) stream the file with minimal overhead. In multithreaded mode, chunking splits the PGN into byte-sized batches aligned to complete games for worker dispatch (parallel I/O, not a semantic stage).
2. **PGN parse** — structural parse: tag pairs, mainline SAN strings, game boundaries (`GameAssembler`, [`movetext.ts`](src/pgn/movetext.ts)).
3. **Replay** — SAN decode + play on a board ([`src/replay/`](src/replay/)), mode `'skip' | 'board' | 'actions'`.
4. **Analyze** — [`GameProcessor`](src/core/game-processor.ts) runs configured trackers ([`src/trackers/`](src/trackers/)).

**Key directories:**

| Path                 | Purpose                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/types/`         | Shared pipeline contracts (`analysis`, `parse-pgn`, `actions`, `tracker`, `errors`, `tokens`) — not module-private plumbing |
| `src/core/`          | Orchestration (`GameProcessor`, worker pool, config/merge helpers, `analysis-runtime`, `worker-types`)                      |
| `src/io/`            | Streaming I/O (`readLines`, `readPgnChunks`, worker chunk bytes)                                                            |
| `src/pgn/`           | PGN parse (`GameAssembler`, `movetext`, `parsePGN`)                                                                         |
| `src/board/`         | Board coords, piece names (`chessalyzer/board` public barrel)                                                               |
| `src/replay/`        | Replay — SAN decode + apply (`GameReplayer`, `ReplayMode` internal, `SanApplier`, `SanDecoder`)                             |
| `src/trackers/`      | Built-in and base tracker implementations                                                                                   |
| `bench/`             | Callable performance benchmarks (`bench-*.ts`)                                                                              |
| `bench/atomic/`      | Atomic micro-benchmark implementations                                                                                      |
| `bench/lib/`         | Shared bench utilities — see **Bench lib** below                                                                            |
| `bench/exploratory/` | Ad-hoc profiling scripts (not wired to npm)                                                                                 |
| `test/`              | Integration tests, fixtures, corpus (unit tests live in `src/**/__tests__/`)                                                |
| `pgn/`               | Local large PGN files for manual/bench runs (gitignored)                                                                    |
| `manual-tests/`      | Release smoke tests against the built package                                                                               |
| `docs/`              | Fumadocs site (`content/docs/` MDX, `examples/` sample PGN + output generator). Style: [`docs/STYLE.md`](docs/STYLE.md)     |

**Runtime:** Node ≥ 22 or Bun. Tests and benches are typically run with Bun.

### Type organization

Use a **hybrid** layout. **Where a type file lives** and **which public subpath exports it** are separate decisions — e.g. `ParsedGame` is defined in `src/types/parse-pgn.ts` but exported from `chessalyzer/pgn`; board coords live under `src/board/` and export from `chessalyzer/board`.

#### Decision guide

| Question                                                                                     | If yes →                                                             | If no →    |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| Does one module invent and own the invariant?                                                | Colocate with that module's runtime code                             | Continue ↓ |
| Do two or more **peer** pipeline stages share it, with neither owning the other?             | `src/types/` (shared contract)                                       | Continue ↓ |
| Is it internal plumbing for a single stage (worker IPC, processor config, resolver helpers)? | Colocate in that stage (`core/`, `replay/`, …), **not** `src/types/` | —          |

**Default:** colocate. Only add to `src/types/` when moving the type into one submodule would force an awkward dependency (e.g. `replay` importing `trackers` only for a type, or `core` owning game-parse shapes).

Do **not** mandate a `types.ts` file in every submodule — use one when a module has a **cluster** of related types (`tile-tracker-types.ts`, `heatmap-types.ts`), otherwise keep small shapes next to the function or class that owns them (`GameAssemblerOptions`, `ReplayMode`).

#### Where types belong (current layout)

| Location            | Put here                                        | Examples                                                                                                                                 |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/types/`**    | Cross-stage pipeline contracts                  | `AnalyzeOptions`, `ParsedGame` / `AssembledGame`, `Action`, `TrackerDef` / `TrackerInstance`, `AnalyzeError`, `PlayerColor` / SAN tokens |
| **`src/board/`**    | Board geometry and piece identity               | `Square`, `BoardCoord`, `StartingPieceName`, `PieceName`, `ChessPiece`                                                                   |
| **`src/replay/`**   | Replay policy and decode internals              | `ReplayMode` (internal), `PawnResolution`, `ReplayFailure`                                                                               |
| **`src/pgn/`**      | Parse-only options resolved at the pgn boundary | `StandaloneParseOptions`, `resolveStandaloneParseOptions`                                                                                |
| **`src/trackers/`** | Tracker state, heatmap API, built-in shapes     | `TileTrackerState`, `HeatmapData`, `HeatmapPieceRef`, `MoveCoords`                                                                       |
| **`src/core/`**     | Analyze orchestration and worker plumbing       | `GameProcessorConfig`, `AnalyzeRunState`, `WorkerMessage`, `TrackerSnapshot`, `NormalizedAnalyzeOptions`                                 |
| **`src/io/`**       | Stream/chunk interfaces                         | `LineStream`, `PgnChunk` types (fully self-contained; no `#types` imports)                                                               |

#### `src/types/` file map

| File            | Role                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `analysis.ts`   | Public `analyzePGN` options and result shapes                                                                                  |
| `parse-pgn.ts`  | Game shapes at the parse ↔ replay ↔ analyze boundary (`AssembledGame` is internal hot-path; `ParsedGame` is public via `/pgn`) |
| `actions.ts`    | Move-level replay output consumed by board and move trackers (public via `/replay`)                                            |
| `tracker.ts`    | Tracker authoring contract only (`TrackerDef*`, `TrackerFactory`, `TrackerInstance`) — not heatmap or worker snapshot types    |
| `errors.ts`     | Shared analyze/replay error model (public via root)                                                                            |
| `tokens.ts`     | Small cross-cutting literals (`PlayerColor`, `PieceToken`, …)                                                                  |
| `open-union.ts` | `OpenUnion<T>` helper for extensible string unions                                                                             |

#### Public exports vs internal types

Public barrels re-export **user-facing** names from the **owning** module. Internal contracts stay off the public surface even if they live in `src/types/`.

| Subpath                | Owns (exports)                                                     | Does **not** export                                    |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `chessalyzer`          | `analyzePGN`, `AnalyzeOptions`, errors, `ReplayMode`, `GameFilter` | `HeatmapData`, `TrackerInstance` (use `/trackers`)     |
| `chessalyzer/board`    | coords, piece names, `PlayerColor`                                 | `ChessPiece` (internal board helper shape)             |
| `chessalyzer/replay`   | `Action*` only                                                     | board types, `ReplayMode`                              |
| `chessalyzer/pgn`      | parse API + `ParsedGame`                                           | `AssembledGame`                                        |
| `chessalyzer/trackers` | factories, state shapes, heatmaps                                  | `TrackerDef` / `TrackerFactory` (infer from factories) |

`/trackers` may **dual-export** piece-name aliases (`StartingPieceName`, `PieceName`) that also appear on `/board` when tracker APIs return or accept them (`isStartingPieceName`, `HeatmapPieceRef`) — structural aliases, not a second owner.

#### Anti-patterns

- Putting worker IPC or processor runtime in `src/types/` — belongs in `core/worker-types.ts`, `core/analysis-runtime.ts`.
- Re-exporting board concepts from `chessalyzer/replay` — use `/board` (or `/trackers` for tracker-centric aliases).
- A catch-all `game.ts` or mixed-concern hub file — split by real owner (`ChessPiece` → board, `MoveCoords` → tile tracker, heatmap squares → trackers).
- Exporting every type from the root entry — keep `src/index.ts` to analyze + errors; domain types live on subpaths.
- Collapsing `AssembledGame` (`moves: string[]`) into `ParsedGame` (`ParsedMove[]`) on hot paths — see **Performance** below.

### Execution paths (`GameProcessor`)

`analyzePGN` picks one of two internal paths:

1. **Single-threaded** — `workers: false`. Main thread: I/O (`readLines`) → PGN parse (`GameAssembler`) → replay (`GameReplayer`, mode from per-config `replayMode`) → analyze (trackers).
2. **Multithreaded (worker-chunk)** — default. Main thread: I/O + chunking (`readPgnChunks`) → workers PGN-parse once per chunk (once per chunk for all `runs` in a multi-run task). Workers replay and accumulate tracker state; per-batch worker→main posts counts/errors only, tracker payloads flush at pool drain. `maxGames` is enforced on workers. **JavaScript `filter` predicates imply single-threaded analysis** (`workers` omitted or `false`); an explicit worker pool with a filter is rejected in `normalizeAnalyzeOptions`.

**Replay mode:** Default from `resolveReplayMode(hasMoveTrackers)`; override via `AnalyzeOptions.replay` (`resolveEffectiveReplayMode`). Move trackers require `'actions'`. Per-config `replayMode` is stored at normalization and passed to workers via `WorkerInitData`. Count-only runs skip board replay by default (`SKIP_REPLAY_WITHOUT_MOVE_TRACKERS = true` in [`src/replay/replay-mode.ts`](src/replay/replay-mode.ts)).

**Parse headers:** `AnalyzeOptions.headers` maps to processor `parseHeaders`; when omitted, inferred from game trackers only (`'auto'`). `headers: false` throws when a game tracker is present. Set `headers: true` when a filter reads tag pairs.

### Custom tracker multithreaded contract

User-facing docs: [Custom trackers](docs/content/docs/trackers/custom.mdx). Trackers are **definitions** (behavior + identity) separate from **state** (plain data). `defineGameTracker` / `defineMoveTracker` return a **factory** (callable); call it to get a `TrackerInstance` with `.state`. Pass instances to `analyzePGN` (e.g. `tileTracker()`), not bare definitions. For MT (`workers` not `false`), custom trackers must:

1. Live in a **separate module** with a **default-exported factory** (return value of `defineGameTracker` / `defineMoveTracker`).
2. Set **`id`** and **`workerModule = import.meta.url`** so workers can load the module.
3. Implement **`init(options?)`**, **`track(state, …)`**, and **`merge(state, other)`** — state is plain structured-cloneable data; only states cross the worker boundary as `TrackerSnapshot { index, state }` (defined in `core/worker-types.ts`).
4. Pass optional **options** to the factory call (`myTracker({ minElo: 2000 })`), not on the definition. Workers import the factory and call it with those options before accumulating state.

Built-ins register in [`builtin-registry.ts`](src/trackers/builtin-registry.ts); customs are loaded from `workerModule`. `workerModule = import.meta.url` requires an unbundled Node ≥ 22 or Bun runtime. Move trackers may override **`onGameEnd(state)`** for per-game flush hooks. See [`test/fixtures/custom-game-tracker.ts`](test/fixtures/custom-game-tracker.ts).

## Performance

This library has been **carefully tuned for performance**. Some code may look unusual compared to idiomatic TypeScript — that is intentional. Do not “clean up” or simplify hot paths without measuring.

Examples of deliberate choices:

- **Manual `Symbol.asyncIterator` instead of `async function*`** in `readPgnChunks` (~7–10% faster than async generators on large files).
- **`Array.concat` vs `push`** in specific hot loops where benchmarks showed a win. Run `npm run bench:atomic -- array` before changing append patterns.
- **Readline `'line'` events instead of `for await`** in `openLineStream` / `readLines` — sync push handlers beat async-iterator pull on large PGNs; `await` only at chunk boundaries in `readPgnChunks`. See `bench/exploratory/line-reader-readline.ts`. Do not reintroduce per-line async iteration for “cleaner” ergonomics.
- **Worker-side parsing** with transferable UTF-8 chunk bytes to minimize main-thread work and copying.
- **Zero production dependencies.**
- **`AssembledGame` (`moves: string[]`) vs public `ParsedGame` (`moves: ParsedMove[]`)** — the analyze/replay pipeline keeps mainline SANs as strings (`GameAssembler`, `GameReplayer`, workers). `{ san }` objects are materialized only at public boundaries (`parsePGN`, `streamParsePGN`, game trackers, filters) via `toParsedGame()` in [`src/pgn/to-parsed-game.ts`](src/pgn/to-parsed-game.ts). **Do not collapse this into `ParsedMove[]` everywhere** for API neatness: v4 alpha benching showed only ~1–2% regression on `replay: 'skip'` but a large regression on `replay: 'board'`, because board replay loads every move in a tight loop — `moves[i].san` (object + property) vs `moves[i]` (string). Millions of short-lived `{ san }` allocations also add GC pressure during CPU-bound replay.

### Rules for agents

1. **Measure before and after** any change that touches parsing, I/O, chunking, worker dispatch, or tracker hot paths.
2. **Prefer existing benchmarks.** Run the relevant script and compare mean/min and coefficient of variation (CV).
3. **Add a bench when introducing a non-obvious optimization** so the rationale is reproducible (see `bench/exploratory/` scripts as templates).
4. **Do not regress throughput for readability alone.** If a refactor is needed, preserve behavior and verify performance.
5. **Use a large fixture for end-to-end checks.** Short runs (~3 s) have high variance because startup dominates. Use the perf bench below.

### Benchmarks

Run `bench:perf` when performance-sensitive code changes, in all `skip`, `board` and `actions` mode (see below). Always run the scripts sequentially to not skew the results. If the results of the bench are inconclusive, check back with the user first instead of directly reverting the change that is being benchmarked.

| Command                                       | Purpose                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `bun run bench:perf [skip,board,actions]`     | **Primary regression check** — full `analyzePGN` on a large cached PGN |
| `bun run bench:perf:bun [skip,board,actions]` | Same, on Bun                                                           |
| `bun run bench:atomic -- array`               | Array append micro-benchmarks                                          |

**Exploratory scripts** (run directly with `bun bench/exploratory/<name>.ts`):

- `bench-chunk-sizes.ts` — chunk size × worker count sweep
- `profile-bottlenecks-node.ts` — staged pipeline profile
- `line-reader-readline.ts` — readline events vs `for await` vs `readLines` / `readPgnChunks`
- `bench-worker-overhead.ts` — worker pool startup cost

**Perf bench env vars:**

- `BENCH_RUNS` — timed iterations (default `3`)
- `BENCH_PGN_REPEATS` — concatenate the largest `pgn/*.pgn` N times (default `2`; cached under `bench/.cache/`)
- `BENCH_WARMUP=0` — skip warmup iteration

Pass `single-threaded` to `bench-perf` to benchmark only the single-threaded path.

**Bench lib** (`bench/lib/`):

- `harness.ts` + `report.ts` — atomic micro-benchmarks (tinybench ops/s); used by `bench/atomic/`
- `timing.ts` — wall-clock timing (`runTimed`, `timeAsync`, `printTimedResults`); used by `bench-perf` and exploratory scripts
- `pgn-fixture.ts` — resolve large PGN paths for e2e benches (`resolvePerfPgn`, `findLargestPgn`)
- `fixtures.ts` — synthetic move/line data for atomic micro-benches

**Manual release smoke tests** (built package, smaller file):

- `manual-tests/test-release.ts` — multithreaded
- `manual-tests/test-release-singlethreaded.ts` — single-threaded (`workers: false`)

Place large Lichess exports in `pgn/` (gitignored). The perf bench automatically picks the largest file available.

### Documentation

User-facing docs live in [`docs/content/docs/`](docs/content/docs/) (Fumadocs / Waku). When editing or adding pages, follow **[`docs/STYLE.md`](docs/STYLE.md)** — friendly, example-first Guides; internals in Going Further; real return shapes from [`docs/examples/`](docs/examples/); Callouts for tips and caveats; no changelog leftovers.

### Tests

- **Unit tests** — colocated under `src/<module>/__tests__/` next to the code they cover. Import SUT via `#` aliases only (no `chessalyzer`). Run with `bun run test:unit` (no build).
- **Integration tests** — `test/integration/` against the built package (`chessalyzer`). Require `bun run build` first (`bun run test:integration`). See [`test/README.md`](test/README.md) for import rules, fixtures vs corpus.

```bash
bun run test:unit
bun run build && bun run test:integration
bun run typecheck
bun run lint
```

Run the full test suite after functional changes (`bun run build && bun test`).
