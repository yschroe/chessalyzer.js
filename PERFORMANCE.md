# Performance improvement worklist

Findings from the 2026-10-17 review using the `optimize-javascript` skill. Start with candidates 1–3, then work through the remaining items independently. Each checkbox represents work still to do; no optimization has been implemented or validated by an A/B comparison yet.

Profile percentages identify where time was sampled, not expected speedups. The quadratic cases below were confirmed with operation counts. Other proposed improvements remain hypotheses to benchmark.

## Recorded baseline

Measurements were taken at commit `4d7423a74cba91bc50d9d9b03c0f5e072415c97c`, on an Apple M1 running Node.js `v26.10.0` / V8 `14.6.202.34-node.34`. Re-establish the baseline at the revision used for each experiment; these numbers are historical reference points.

The unprofiled benchmark used the cached `lichess_db_standard_rated_2014-09.pgn` concatenated twice: **1777.3 MiB, 2,000,112 games, 135,020,744 moves**. All scenarios were single-threaded without trackers, with one warmup and three timed runs per mode, executed sequentially.

```sh
BENCH_RUNS=3 bun run bench:perf skip board actions --single-threaded
```

| Replay mode |     Mean |  Minimum | Standard deviation |   CV |
| ----------- | -------: | -------: | -----------------: | ---: |
| `skip`      |  8.234 s |  8.184 s |            0.048 s | 0.6% |
| `board`     | 21.105 s | 20.928 s |            0.230 s | 1.1% |
| `actions`   | 37.801 s | 36.913 s |            1.505 s | 4.0% |

Separate CPU profiles used one copy of the same source file, approximately **889 MiB, 1,000,056 games, 67,510,372 moves**, after a 10,000-game warmup. Four fresh processes profiled `skip`, `board`, `actions`, and `actions` with `tileTracker()`, `pieceTracker()`, and `gameTracker()`. All used `workers: false`. Sample shares quoted below include idle samples and are approximate; inlining can affect attribution. No multithreaded or Bun baseline was recorded in this review.

The original local harnesses were `/private/tmp/chessalyzer-perf-review.mts` and `/private/tmp/chessalyzer-scan-check.mts`; profiles were `/private/tmp/chessalyzer-{skip,board,actions,trackers}.cpuprofile`. These are temporary, machine-local artifacts, not repository fixtures. Preserve a portable reproduction under `bench/exploratory/` when implementing a non-obvious optimization.

## 1. Skip board resets when replay is disabled

**Evidence:** Board and piece-list resets accounted for approximately **8% of samples** in the count-only profile. `GameReplayer.processGame()` resets the context after every successful game, even for `replay: 'skip'`.

**Code:** [game-replayer.ts](src/replay/game-replayer.ts), [san-context.ts](src/replay/san-context.ts), [chess-board.ts](src/board/chess-board.ts), [piece-positions.ts](src/board/piece-positions.ts).

- [ ] Verify the board-state invariant across successful replay, skipped replay, and replay failures.
- [ ] Experiment with guarding the successful-game reset when replay is disabled.
- [ ] Verify mixed runs, consecutive games, tracker end hooks, and `abort` / `skip-game` behavior.
- [ ] Measure all replay modes in both execution paths and record the outcome below.

**Acceptance:** Counts, tracker state, and error behavior remain equivalent; count-only throughput improves beyond measured noise without regressing replay modes.

## 2. Recognize game results from the line suffix

**Evidence:** `extractGameResult()` accounted for approximately **7.7% of count-only profile samples**. It uses a regex search to recognize a terminator at the end of each cleaned movetext line.

**Code:** [movetext.ts](src/pgn/movetext.ts), consumed by [game-assembler.ts](src/pgn/game-assembler.ts) and [pgn-chunks.ts](src/io/pgn-chunks.ts).

- [ ] Benchmark a suffix-oriented fast path against the existing regex on short and long lines, matches, misses, and trailing whitespace.
- [ ] Preserve `1-0`, `0-1`, `1/2-1/2`, and `*`, including the current whitespace and suffix-matching semantics. Keep unrelated parser behavior changes separate.
- [ ] Check empty lines, non-result endings, comments removed before detection, and chunk-boundary agreement with assembly.
- [ ] Compare full analysis throughput in all modes and record the outcome.

**Acceptance:** Equivalent results and game boundaries, with a measurable gain on representative PGN input. Optimize result detection independently of SAN extraction; this finding does not justify replacing the tuned move regex.

## 3. Avoid assembler copies

**Evidence:** The first movetext line concatenates its extracted moves onto an empty array. Completed headers are spread-copied immediately before the assembler clears its reference. Repeated concatenation also copies the growing move array on every additional movetext line, producing quadratic copying for heavily wrapped games.

**Code:** `GameAssembler.processLine()` in [game-assembler.ts](src/pgn/game-assembler.ts).

- [ ] Benchmark adopting the first matched-moves array directly, keeping subsequent append behavior unchanged initially.
- [ ] Independently benchmark transferring the completed headers object instead of cloning it; confirm the assembler never mutates that object afterward.
- [ ] Verify retained games and headers remain independent across subsequent assembly, public parsing, filters, and game trackers.
- [ ] Investigate linear accumulation for heavily wrapped games as a separate experiment, using the operation counts below.
- [ ] Run `bun run bench:atomic -- array` before changing append patterns, then check large-file throughput in all modes.

**Acceptance:** Preserve the existing common-case performance and ownership semantics. Any more complex multiline strategy must demonstrate better scaling without sacrificing the tuned single-line path. Keep internal moves as `string[]`; materialize `{ san }` only at existing public boundaries.

## 4. Stop rescanning unfinished chunks

**Evidence:** Once a chunk reaches its target without finding a completed game, `takeCompleteChunk()` scans backward through the accumulated lines again after each new line. Operation counts confirmed quadratic behavior when the unfinished game keeps growing.

**Code:** `findLastCompleteGameLineIndex()` and `readPgnChunks()` in [pgn-chunks.ts](src/io/pgn-chunks.ts).

- [ ] Reproduce the scan counts below with a portable exploratory harness.
- [ ] Experiment with scanning the existing buffer once at the threshold and checking only newly appended lines after an unsuccessful scan.
- [ ] Preserve complete-game boundaries, remainder handling, EOF behavior, and byte/line threshold semantics.
- [ ] Verify linear operation-count growth for long unfinished games and unterminated input, then benchmark normal PGN chunking and multithreaded analysis.

**Acceptance:** Eliminate repeated scans of unchanged lines while preserving chunk contents and normal-input throughput. Avoid introducing result parsing on every line before the threshold unless measurements justify it.

### Operation-count reproduction for candidates 3 and 4

The structural stress input repeats `1. e4 e5\n` N times and ends with `1-0\n`. It exercises assembly/chunking only; the repeated moves are not a valid replay sequence. Chunking used `targetBytes: 1` deliberately to expose the threshold-extension behavior at small sizes. With normal defaults, the same issue requires an unfinished game large enough to cross the configured threshold.

Count visits to the repeated movetext line inside the backward chunk scan. Separately, count the total elements in the arrays produced by assembler concatenations. The original harness instrumented `String.prototype.startsWith` and `Array.prototype.concat` in isolation, restoring both afterward; these counts are not timing measurements.

| Repeated movetext lines | Chunk-scan line visits | Elements in concatenation outputs |
| ----------------------: | ---------------------: | --------------------------------: |
|                   1,000 |                500,500 |                         1,001,000 |
|                   2,000 |              2,001,000 |                         4,002,000 |
|                   4,000 |              8,002,000 |                        16,004,000 |

The harness also asserted one emitted chunk containing N + 1 lines and an assembled game containing 2N moves. Doubling N roughly quadruples both operation counts. Ordinary single-line games do not encounter this worst case.

## 5. Simplify pooled action handling

**Evidence:** The ordinary-move paths repeatedly delete `moveAction.castle`, while castling creates separate action objects. Capture actions add/delete `enPassant`. These operations occur in hot decoder methods, but their individual costs have not been isolated.

**Code:** [san-decoder.ts](src/replay/san-decoder.ts), [san-context.ts](src/replay/san-context.ts), [actions.ts](src/types/actions.ts).

- [ ] Audit whether custom trackers may mutate pooled actions and whether the deletes currently clear such mutations.
- [ ] Benchmark removing redundant deletes only where the action contract permits it.
- [ ] Separately consider ordinary/en-passant capture buffers that preserve the required property sets.
- [ ] Verify captures, en passant, both castling sides, promotions, consecutive games, and custom tracker observations.
- [ ] Measure `actions` mode with and without trackers, including a representative custom tracker.

**Acceptance:** Equivalent action values and observable property presence with a measured throughput gain. Setting a field to `undefined` differs from deleting it for `in`, `Object.keys`, and own-property checks. Deleting an already absent property does not itself establish a hidden-class transition; do not assume every delete causes one.

## 6. Reuse tile-tracker coordinates

**Evidence:** `processMove()` decodes and validates the source coordinates, then calls `addOccupation()`, which decodes them again. The track hook also constructs a `{ from, to }` wrapper even though the existing action has those fields. The wrapper may already be eliminated by V8; allocation savings are unproven.

**Code:** `processMove()`, `addOccupation()`, and `track()` in [tile-tracker.ts](src/trackers/tile/tile-tracker.ts).

- [ ] Benchmark passing the decoded source coordinates or source cell into the occupation update.
- [ ] Independently benchmark passing the existing action instead of constructing the coordinate wrapper.
- [ ] Compare full tile counters for normal moves, captures, en passant, castling, promotions, and game-end occupation flushes.
- [ ] Measure tile-only and combined built-in tracker workloads; the default perf benchmark has no trackers and cannot establish this candidate's benefit.

**Acceptance:** Identical tile state with a measured tracker-workload gain. Keep experiments separate so any improvement can be attributed to the actual change.

## 7. Bound queued worker chunks

**Evidence:** The dispatch loop continues consuming chunks without awaiting worker capacity. `WorkerPool.runTask()` appends tasks to an unbounded queue, retaining their chunk buffers until dispatch. This is a code-inspection finding; queue growth and memory impact were not measured in the review.

**Code:** `processPGNWithWorkers()` in [game-processor.ts](src/core/game-processor.ts), `runTask()` / `pump()` in [worker-pool.ts](src/core/worker-pool.ts).

- [ ] Measure queue depth, queued bytes, peak RSS, and throughput with slow trackers and a small worker pool.
- [ ] Experiment with a bounded number of queued/in-flight chunks proportional to worker count, pausing the producer when capacity is exhausted.
- [ ] Preserve concurrent worker utilization and chunk-level awaiting; do not serialize dispatch by waiting for each task's completion individually.
- [ ] Verify worker errors, drain/flush, early limits, shutdown, and normal completion cannot leave capacity waiters stuck.
- [ ] Compare peak memory and throughput across worker counts and tracker costs.

**Acceptance:** Bounded backlog and lower memory pressure on slow-consumer workloads, with equivalent results and no material throughput regression. This targets temporary backlog, not a demonstrated permanent memory leak.

## Validation workflow for each candidate

Follow the repository's [performance and testing rules](AGENTS.md). Work on one independent change at a time.

1. Record the baseline commit, candidate commit, runtime, machine, fixture, options, and relevant tracker configuration.
2. Establish correctness outside timing: compare counts, errors, relevant tracker state, and public observable behavior. Add focused regression coverage where the behavior or scaling warrants it.
3. Compare unchanged-build A/A runs to estimate noise, then use fresh sequential A/B processes with identical flags and workloads, alternating AB/BA order across rounds. Warm steady-state workloads; measure startup separately if relevant.
4. Keep per-run samples and inspect distributions before comparing mean, minimum, CV, and paired timing ratios. Profile to locate costs, but measure gains without profiling. Inconclusive results remain unresolved; discuss them before reverting a candidate on performance grounds.
5. Run the full functional checks after implementation:

    ```sh
    bun run build && bun test
    bun run typecheck
    bun run lint
    ```

6. Run all replay modes before and after performance-sensitive changes, with the benchmark commands executed sequentially:

    ```sh
    BENCH_RUNS=3 bun run bench:perf skip board actions --single-threaded
    BENCH_RUNS=3 bun run bench:perf skip board actions
    ```

    Add tracker workloads for candidates 5–7 and operation counts for candidates 3–4. Cross-check Bun with `bench:perf:bun` when evaluating a change intended to benefit both runtimes. Retain the zero-production-dependency constraint.

7. Record the decision below and rerun affected measurements at the final revision. Check off a candidate's steps only when the corresponding work is complete.

## Experiment log

Use one row per experiment, including rejected or inconclusive variants. Link durable benchmark output and reproductions when available.

| Candidate / variant               | Baseline → candidate commits | Workload / runtime | Before → after (mean, min, CV) | Correctness / scaling / memory evidence               | Decision |
| --------------------------------- | ---------------------------- | ------------------ | ------------------------------ | ----------------------------------------------------- | -------- |
| No implementation experiments yet | —                            | —                  | —                              | Initial profiling and operation counts recorded above | Pending  |
