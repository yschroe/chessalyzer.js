# Agent guide

This document orients coding agents working on **chessalyzer.js** — a TypeScript library for batch-analyzing chess PGN files.

## Project overview

Chessalyzer.js parses large PGN databases and runs user-defined **trackers** over each game (move-level or game-level statistics). It is designed for throughput on multi-core machines.

**Main entry points:** `analyzePGN(path, options?)` in [`src/core/analyze.ts`](src/core/analyze.ts) (full pipeline); `parsePGN(path, options?)` in [`src/pgn/parse-pgn.ts`](src/pgn/parse-pgn.ts) via `chessalyzer.js/pgn`; trackers via `chessalyzer.js/trackers`.

**Pipeline (high level):**

1. **I/O** — `readLines` / `openLineStream` in [`src/io/line-reader.ts`](src/io/line-reader.ts) and `readPgnChunks` in [`src/io/pgn-chunks.ts`](src/io/pgn-chunks.ts) stream the file with minimal overhead. In multithreaded mode, chunking splits the PGN into byte-sized batches aligned to complete games for worker dispatch (parallel I/O, not a semantic stage).
2. **PGN parse** — structural parse: tag pairs, mainline SAN strings, game boundaries (`GameAssembler`, [`movetext.ts`](src/pgn/movetext.ts)).
3. **Replay** — SAN decode + play on a board ([`src/replay/`](src/replay/)), mode `'skip' | 'board' | 'actions'`.
4. **Analyze** — [`GameProcessor`](src/core/game-processor.ts) runs configured trackers ([`src/trackers/`](src/trackers/)).

**Terminology:** Canonical glossary in the [README Pipeline section](README.md#pipeline) and [Sprint 11](sprints/sprint-11-pipeline-terminology.md). Public docs use **replay** for SAN decode + play.

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
| `bench/lib/`         | Shared bench utilities (fixtures, timing, PGN resolution)                              |
| `bench/exploratory/` | Ad-hoc profiling scripts (not wired to npm)                                            |
| `test/`              | Integration tests, fixtures, corpus (unit tests live in `src/**/__tests__/`)           |
| `pgn/`               | Local large PGN files for manual/bench runs (gitignored)                               |
| `manual-tests/`      | Release smoke tests against the built package                                          |

**Runtime:** Node ≥ 22 or Bun. Tests and benches are typically run with Bun.

### Execution paths (`GameProcessor`)

`analyzePGN` picks one of two internal paths:

1. **Single-threaded** — `workers: false`. Main thread: I/O (`readLines`) → PGN parse (`GameAssembler`) → replay (`GameReplayer`, mode from per-config `replayMode`) → analyze (trackers).
2. **Multithreaded (worker-chunk)** — default. Main thread: I/O + chunking (`readPgnChunks`) → workers PGN-parse once per chunk (once per chunk for all `runs` in a multi-run task). Without a `filter`, workers replay and accumulate tracker state; per-batch worker→main posts counts/errors only, tracker payloads flush at pool drain. With a `filter`, workers return parsed games and the main thread applies the JS predicate and replay (trackers stay on the main thread for that run). `maxGames` is enforced on workers when there is no filter, and on the main thread after filtering when there is.

**Replay mode:** Default from `resolveReplayMode(hasMoveTrackers)`; override via `AnalyzeOptions.replay` (`resolveEffectiveReplayMode`). Move trackers require `'actions'`. Per-config `replayMode` is stored at normalization and passed to workers via `WorkerInitData`. Count-only runs skip board replay by default (`SKIP_REPLAY_WITHOUT_MOVE_TRACKERS = true` in [`src/replay/replay-mode.ts`](src/replay/replay-mode.ts)).

**Parse headers:** `AnalyzeOptions.headers` maps to processor `parseHeaders`; when omitted, inferred from filter/game trackers. Filters and game trackers force header parsing even when `headers: false`.

### Custom tracker multithreaded contract

User-facing docs: [README Custom Trackers](README.md#custom-trackers). For MT (`workers` not `false`), custom trackers must:

1. Live in a **separate module** with a **default export** of the tracker class.
2. Set **`static trackerId = 'YourUniqueId'`** — stable ID used to match worker instances (minification-safe).
3. Set **`static workerModule = import.meta.url`** — workers dynamically import that URL at startup ([`worker-tracker-registry.ts`](src/core/worker-tracker-registry.ts)).
4. Implement **`merge(tracker)`** — aggregate worker batch stats into the main-thread instance. Duck-type the argument; do **not** use `instanceof` (worker payloads are plain objects after structured clone).

Built-ins register via `trackerId` in the worker registry; customs are loaded from `workerModule`. See [`test/fixtures/custom-game-tracker.ts`](test/fixtures/custom-game-tracker.ts) and [`manual-tests/custom-game-tracker.ts`](manual-tests/custom-game-tracker.ts).

## Performance

This library has been **carefully tuned for performance**. Some code may look unusual compared to idiomatic TypeScript — that is intentional. Do not “clean up” or simplify hot paths without measuring.

Examples of deliberate choices:

- **Manual `Symbol.asyncIterator` instead of `async function*`** in `readPgnChunks` (~7–10% faster than async generators on large files).
- **`Array.concat` vs `push`** in specific hot loops where benchmarks showed a win. Run `npm run bench:atomic -- array` before changing append patterns.
- **Readline `'line'` events instead of `for await`** in `openLineStream` / `readLines` — sync push handlers beat async-iterator pull on large PGNs; `await` only at chunk boundaries in `readPgnChunks`. See `bench/exploratory/line-reader-readline.ts`. Do not reintroduce per-line async iteration for “cleaner” ergonomics.
- **Worker-side parsing** with transferable UTF-8 chunk bytes to minimize main-thread work and copying.
- **Minimal dependencies** — only `chalk` in production.

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

**Manual release smoke tests** (built package, smaller file):

- `manual-tests/test-release.ts` — multithreaded
- `manual-tests/test-release-singlethreaded.ts` — single-threaded (`workers: false`)

Place large Lichess exports in `pgn/` (gitignored). The perf bench automatically picks the largest file available.

### Tests

- **Unit tests** — colocated under `src/<module>/__tests__/` next to the code they cover (e.g. `src/core/__tests__/worker-pool.test.ts`). Prefer `#` import aliases.
- **Integration tests** — `test/integration/` against the built package (`chessalyzer.js`). See [`test/README.md`](test/README.md) for fixtures vs corpus.

```bash
npm test
npm run typecheck
npm run lint
```

Run tests after functional changes. Run `bench:perf` when performance-sensitive code changes.
