# Agent guide

This document orients coding agents working on **chessalyzer** — a TypeScript library for batch-analyzing chess PGN files.

## Project overview

Chessalyzer.js parses large PGN databases and runs user-defined **trackers** over each game (move-level or game-level statistics). It is designed for throughput on multi-core machines.

**Main entry points:** `analyzePGN(path, options?)` in [`src/core/analyze.ts`](src/core/analyze.ts) (full pipeline); `parsePGN(path, options?)` in [`src/pgn/parse-pgn.ts`](src/pgn/parse-pgn.ts) via `chessalyzer/pgn`; trackers via `chessalyzer/trackers`.

**Pipeline (high level):**

1. **I/O** — `readLines` / `openLineStream` in [`src/io/line-reader.ts`](src/io/line-reader.ts) and `readPgnChunks` in [`src/io/pgn-chunks.ts`](src/io/pgn-chunks.ts) stream the file with minimal overhead. In multithreaded mode, chunking splits the PGN into byte-sized batches aligned to complete games for worker dispatch (parallel I/O, not a semantic stage).
2. **PGN parse** — structural parse: tag pairs, mainline SAN strings, game boundaries (`GameAssembler`, [`movetext.ts`](src/pgn/movetext.ts)).
3. **Replay** — SAN decode + play on a board ([`src/replay/`](src/replay/)), mode `'skip' | 'board' | 'actions'`.
4. **Analyze** — [`GameProcessor`](src/core/game-processor.ts) runs configured trackers ([`src/trackers/`](src/trackers/)).

**Key directories:**

| Path                 | Purpose                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `src/core/`          | Orchestration (`GameProcessor`, worker pool, config/merge helpers)                     |
| `src/io/`            | Streaming I/O (`readLines`, `readPgnChunks`, worker chunk bytes)                       |
| `src/pgn/`           | PGN parse (`GameAssembler`, `movetext`, `parsePGN`)                                    |
| `src/replay/`        | Replay — SAN decode + apply (`GameReplayer`, `ReplayMode`, `SanApplier`, `SanDecoder`) |
| `src/types/`         | Public analysis types (`analysis.ts`) vs processor runtime (`analysis-runtime.ts`)     |
| `src/trackers/`      | Built-in and base tracker implementations                                              |
| `bench/`             | Callable performance benchmarks (`bench-*.ts`)                                         |
| `bench/atomic/`      | Atomic micro-benchmark implementations                                                 |
| `bench/lib/`         | Shared bench utilities — see **Bench lib** below                                       |
| `bench/exploratory/` | Ad-hoc profiling scripts (not wired to npm)                                            |
| `test/`              | Integration tests, fixtures, corpus (unit tests live in `src/**/__tests__/`)           |
| `pgn/`               | Local large PGN files for manual/bench runs (gitignored)                               |
| `manual-tests/`      | Release smoke tests against the built package                                          |

**Runtime:** Node ≥ 22 or Bun. Tests and benches are typically run with Bun.

### Execution paths (`GameProcessor`)

`analyzePGN` picks one of two internal paths:

1. **Single-threaded** — `workers: false`. Main thread: I/O (`readLines`) → PGN parse (`GameAssembler`) → replay (`GameReplayer`, mode from per-config `replayMode`) → analyze (trackers).
2. **Multithreaded (worker-chunk)** — default. Main thread: I/O + chunking (`readPgnChunks`) → workers PGN-parse once per chunk (once per chunk for all `runs` in a multi-run task). Workers replay and accumulate tracker state; per-batch worker→main posts counts/errors only, tracker payloads flush at pool drain. `maxGames` is enforced on workers. **JavaScript `filter` predicates require `workers: false`** (validated in `normalizeAnalyzeOptions`).

**Replay mode:** Default from `resolveReplayMode(hasMoveTrackers)`; override via `AnalyzeOptions.replay` (`resolveEffectiveReplayMode`). Move trackers require `'actions'`. Per-config `replayMode` is stored at normalization and passed to workers via `WorkerInitData`. Count-only runs skip board replay by default (`SKIP_REPLAY_WITHOUT_MOVE_TRACKERS = true` in [`src/replay/replay-mode.ts`](src/replay/replay-mode.ts)).

**Parse headers:** `AnalyzeOptions.headers` maps to processor `parseHeaders`; when omitted, inferred from game trackers only (`'auto'`). `headers: false` throws when a game tracker is present. Set `headers: true` when a filter reads tag pairs.

### Custom tracker multithreaded contract

User-facing docs: [README Custom Trackers](README.md#custom-trackers). Trackers are **definitions** (behavior + identity) separate from **state** (plain data owned per thread). For MT (`workers` not `false`), custom trackers must:

1. Live in a **separate module** with a **default export** (factory object from `defineGameTracker` / `defineMoveTracker`).
2. Set **`id`** and **`workerModule = import.meta.url`** so workers can load the module.
3. Implement **`init()`**, **`track(state, …)`**, and **`merge(state, other)`** — state is plain structured-cloneable data; only states cross the worker boundary as `TrackerSnapshot { id, state }`.
4. Optional **`options`** (plain data) are cloned to workers before `init()`.

Built-ins register in [`builtin-registry.ts`](src/trackers/builtin-registry.ts); customs are loaded from `workerModule`. `workerModule = import.meta.url` requires an unbundled Node ≥ 22 or Bun runtime. Move trackers may override **`onGameEnd(state)`** for per-game flush hooks. See [`test/fixtures/custom-game-tracker.ts`](test/fixtures/custom-game-tracker.ts).

## Performance

This library has been **carefully tuned for performance**. Some code may look unusual compared to idiomatic TypeScript — that is intentional. Do not “clean up” or simplify hot paths without measuring.

Examples of deliberate choices:

- **Manual `Symbol.asyncIterator` instead of `async function*`** in `readPgnChunks` (~7–10% faster than async generators on large files).
- **`Array.concat` vs `push`** in specific hot loops where benchmarks showed a win. Run `npm run bench:atomic -- array` before changing append patterns.
- **Readline `'line'` events instead of `for await`** in `openLineStream` / `readLines` — sync push handlers beat async-iterator pull on large PGNs; `await` only at chunk boundaries in `readPgnChunks`. See `bench/exploratory/line-reader-readline.ts`. Do not reintroduce per-line async iteration for “cleaner” ergonomics.
- **Worker-side parsing** with transferable UTF-8 chunk bytes to minimize main-thread work and copying.
- **Zero production dependencies.**
- **`AssembledGame` (`moves: string[]`) vs public `ParsedGame` (`moves: ParsedMove[]`)** — the analyze/replay pipeline keeps mainline SANs as strings (`GameAssembler`, `GameReplayer`, workers). `{ san }` objects are materialized only at public boundaries (`parsePGN`, `streamParsePGN`, game trackers, filters) via `toParsedGame()` in [`src/types/parse-pgn.ts`](src/types/parse-pgn.ts). **Do not collapse this into `ParsedMove[]` everywhere** for API neatness: v4 alpha benching showed only ~1–2% regression on `replay: 'skip'` but a large regression on `replay: 'board'`, because board replay loads every move in a tight loop — `moves[i].san` (object + property) vs `moves[i]` (string). Millions of short-lived `{ san }` allocations also add GC pressure during CPU-bound replay. Re-benchmarking this split is unnecessary unless the move representation or hot-path consumers change.

### Rules for agents

1. **Measure before and after** any change that touches parsing, I/O, chunking, worker dispatch, or tracker hot paths.
2. **Prefer existing benchmarks.** Run the relevant script and compare mean/min and coefficient of variation (CV).
3. **Add a bench when introducing a non-obvious optimization** so the rationale is reproducible (see `bench/exploratory/` scripts as templates).
4. **Do not regress throughput for readability alone.** If a refactor is needed, preserve behavior and verify performance.
5. **Use a large fixture for end-to-end checks.** Short runs (~3 s) have high variance because startup dominates. Use the perf bench below.

### Benchmarks

| Command                         | Purpose                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| `npm run bench:perf`            | **Primary regression check** — full `analyzePGN` on a large cached PGN |
| `npm run bench:perf:bun`        | Same, on Bun                                                           |
| `npm run bench:atomic -- array` | Array append micro-benchmarks                                          |

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

### Tests

- **Unit tests** — colocated under `src/<module>/__tests__/` next to the code they cover (e.g. `src/core/__tests__/worker-pool.test.ts`). Prefer `#` import aliases.
- **Integration tests** — `test/integration/` against the built package (`chessalyzer`). See [`test/README.md`](test/README.md) for fixtures vs corpus.

```bash
npm test
npm run typecheck
npm run lint
```

Run tests after functional changes. Run `bench:perf` when performance-sensitive code changes.
