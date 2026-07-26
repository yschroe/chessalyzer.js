# Agent guide

This document orients coding agents working on **chessalyzer.js** — a TypeScript library for batch-analyzing chess PGN files.

## Project overview

Chessalyzer.js parses large PGN databases and runs user-defined **trackers** over each game (move-level or game-level statistics). It is designed for throughput on multi-core machines.

**Main entry point:** `Chessalyzer.analyzePGN(path, config?, multithreadCfg?)` in `src/core/chessalyzer.ts`.

**Pipeline (high level):**

1. **Line reading** — `readLinesFast` / `readPgnChunks` in `src/pgn/line-reader.ts` stream the file with minimal overhead.
2. **Chunking (multithreaded mode)** — the main thread splits the PGN into byte-sized chunks aligned to complete games and dispatches them to workers.
3. **Parsing** — workers tokenize movetext and build game objects (`src/parsing/`, `src/pgn/`).
4. **Tracking** — configured trackers receive move/game data (`src/tracker/`).

**Key directories:**

| Path            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `src/core/`     | Orchestration (`GameProcessor`, worker pool)                  |
| `src/pgn/`      | PGN I/O, chunking, game assembly                              |
| `src/parsing/`  | Move/game parsing                                             |
| `src/tracker/`  | Built-in and base tracker implementations                     |
| `bench/`        | Performance benchmarks and micro-benches                      |
| `test/`         | Unit and integration tests                                    |
| `manual-tests/` | Local-only large PGN files (gitignored) for manual/bench runs |

**Runtime:** Node ≥ 22 or Bun. Tests and benches are typically run with Bun.

## Performance

This library has been **carefully tuned for performance**. Some code may look unusual compared to idiomatic TypeScript — that is intentional. Do not “clean up” or simplify hot paths without measuring.

Examples of deliberate choices:

- **Manual `Symbol.asyncIterator` instead of `async function*`** in `readPgnChunks` (~7–10% faster than async generators on large files). See `bench/bench-pgn-chunks-iterator.ts`.
- **`Array.concat` vs `push`** in specific hot loops where benchmarks showed a win. Check nearby bench comments or run `bench/atomic/array.ts` before changing append patterns.
- **Fixed-size circular-buffer queue** in `readLinesFast` (Node-style `FixedQueue`) to avoid shift-from-array costs.
- **Worker-side parsing** with transferable UTF-8 chunk bytes to minimize main-thread work and copying.
- **Minimal dependencies** — only `chalk` in production.

### Rules for agents

1. **Measure before and after** any change that touches parsing, I/O, chunking, worker dispatch, or tracker hot paths.
2. **Prefer existing benchmarks.** Run the relevant script and compare mean/min and coefficient of variation (CV).
3. **Add a bench when introducing a non-obvious optimization** so the rationale is reproducible (see `bench/bench-pgn-chunks-iterator.ts` as a template).
4. **Do not regress throughput for readability alone.** If a refactor is needed, preserve behavior and verify performance.
5. **Use a large fixture for end-to-end checks.** Short runs (~3 s) have high variance because startup dominates. Use the perf bench below.

### Benchmarks

| Command                                  | Purpose                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run bench:perf`                     | **Primary regression check** — full `analyzePGN` multithreaded + single-threaded on a large cached PGN |
| `npm run bench:perf:bun`                 | Same, on Bun                                                                                           |
| `bun bench/bench-pgn-chunks-iterator.ts` | Iterator implementation comparison                                                                     |
| `npm run bench -- array`                 | Array append micro-benchmarks                                                                          |
| `bun bench/bench-chunk-sizes.ts`         | Chunk size × worker count sweep                                                                        |

**Perf bench env vars:**

- `BENCH_RUNS` — timed iterations per scenario (default `5`)
- `BENCH_PGN_REPEATS` — concatenate the largest `pgn/*.pgn` N times (default `3`; cached under `bench/.cache/`)
- `BENCH_WARMUP=0` — skip warmup iteration

**Manual release smoke tests** (built package, smaller file):

- `manual-tests/test-release.ts` — multithreaded
- `manual-tests/test-release-singlethreaded.ts` — single-threaded (`multithreadCfg: null`)

Place large Lichess exports in `manual-tests/` (gitignored). The perf bench automatically picks the largest file available.

### Tests

```bash
npm test
npm run typecheck
npm run lint
```

Run tests after functional changes. Run `bench:perf` when performance-sensitive code changes.
