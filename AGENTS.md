# Agent guide

This document orients coding agents working on **chessalyzer.js** — a TypeScript library for batch-analyzing chess PGN files.

## Project overview

Chessalyzer.js parses large PGN databases and runs user-defined **trackers** over each game (move-level or game-level statistics). It is designed for throughput on multi-core machines.

**Main entry point:** `analyzePGN(path, options?)` in [`src/core/analyze.ts`](src/core/analyze.ts).

**Pipeline (high level):**

1. **Line reading** — `readLinesFast` / `readPgnChunks` in `src/pgn/line-reader.ts` stream the file with minimal overhead.
2. **Chunking (multithreaded mode)** — the main thread splits the PGN into byte-sized chunks aligned to complete games and dispatches them to workers.
3. **Assemble** — workers tokenize movetext and build game objects (`src/pgn/`).
4. **Replay** — SAN is applied to a board (`src/replay/`), with explicit policy `'none' | 'actions'` (or `'skip'` when gated).
5. **Tracking** — configured trackers receive move/game data (`src/tracker/`).

**Key directories:**

| Path                 | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `src/core/`          | Orchestration (`GameProcessor`, worker pool, config/merge helpers)                 |
| `src/pgn/`           | PGN I/O, chunking, movetext tokenize, game assembly / re-encode                    |
| `src/replay/`        | SAN replay stages (`GameReplayer`, policy, `SanApplier`, `SanToActions`)           |
| `src/types/`         | Public analysis types (`analysis.ts`) vs processor runtime (`analysis-runtime.ts`) |
| `src/tracker/`       | Built-in and base tracker implementations                                          |
| `bench/`             | Callable performance benchmarks (`bench-*.ts`)                                     |
| `bench/atomic/`      | Atomic micro-benchmark implementations                                             |
| `bench/lib/`         | Shared bench utilities (fixtures, timing, PGN resolution)                          |
| `bench/exploratory/` | Ad-hoc profiling scripts (not wired to npm)                                        |
| `test/`              | Unit and integration tests                                                         |
| `pgn/`               | Local large PGN files for manual/bench runs (gitignored)                           |
| `manual-tests/`      | Release smoke tests against the built package                                      |

**Runtime:** Node ≥ 22 or Bun. Tests and benches are typically run with Bun.

### Execution paths (`GameProcessor`)

`analyzePGN` picks one of three internal paths. Prefer collapsing (2) and (3) once filter / `cntGames` can run without re-encoding PGN.

1. **Single-threaded** — `workers: false`. Main thread: `readLinesFast` → `GameAssembler` → `GameReplayer` (policy from `resolveReplayPolicy`).
2. **Worker-parse (preferred MT)** — multithreaded and no `filter` / finite `cntGames`. Main thread: `readPgnChunks` → workers assemble + replay; main merges via `tracker.add`.
3. **Legacy MT** — multithreaded **and** any config has `filter` or finite `cntGames`. Main thread assembles/filters/limits, then `gamesToPgnChunk` re-encodes batches for workers (`batchSize`). Temporary; see IDEAS.md.

**Replay policy:** callers pass `resolveReplayPolicy(hasMoveTrackers)` (`'skip' | 'none' | 'actions'`) into `GameReplayer.processGame`. Today this always replays (`none` or `actions`). Set `SKIP_REPLAY_WITHOUT_MOVE_TRACKERS` in `src/replay/replay-policy.ts` to opt into skipping board replay when there are no move trackers — measure with `bench:perf` before making that the default.

## Performance

This library has been **carefully tuned for performance**. Some code may look unusual compared to idiomatic TypeScript — that is intentional. Do not “clean up” or simplify hot paths without measuring.

Examples of deliberate choices:

- **Manual `Symbol.asyncIterator` instead of `async function*`** in `readPgnChunks` (~7–10% faster than async generators on large files). See `bench/exploratory/bench-pgn-chunks-iterator.ts`.
- **`Array.concat` vs `push`** in specific hot loops where benchmarks showed a win. Run `npm run bench:atomic -- array` before changing append patterns.
- **Fixed-size circular-buffer queue** in `readLinesFast` (Node-style `FixedQueue`) to avoid shift-from-array costs.
- **Worker-side parsing** with transferable UTF-8 chunk bytes to minimize main-thread work and copying.
- **Minimal dependencies** — only `chalk` in production.

### Rules for agents

1. **Measure before and after** any change that touches parsing, I/O, chunking, worker dispatch, or tracker hot paths.
2. **Prefer existing benchmarks.** Run the relevant script and compare mean/min and coefficient of variation (CV).
3. **Add a bench when introducing a non-obvious optimization** so the rationale is reproducible (see `bench/exploratory/bench-pgn-chunks-iterator.ts` as a template).
4. **Do not regress throughput for readability alone.** If a refactor is needed, preserve behavior and verify performance.
5. **Use a large fixture for end-to-end checks.** Short runs (~3 s) have high variance because startup dominates. Use the perf bench below.

### Benchmarks

| Command                         | Purpose                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| `npm run bench:perf`            | **Primary regression check** — full `analyzePGN` on a large cached PGN |
| `npm run bench:perf:bun`        | Same, on Bun                                                           |
| `npm run bench:atomic -- array` | Array append micro-benchmarks                                          |

**Exploratory scripts** (run directly with `bun bench/exploratory/<name>.ts`):

- `bench-pgn-chunks-iterator.ts` — async generator vs manual iterator
- `bench-chunk-sizes.ts` — chunk size × worker count sweep
- `profile-bottlenecks-node.ts` — staged pipeline profile
- `line-reader-readline.ts` — readline vs `readLinesFast`

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

```bash
npm test
npm run typecheck
npm run lint
```

Run tests after functional changes. Run `bench:perf` when performance-sensitive code changes.
