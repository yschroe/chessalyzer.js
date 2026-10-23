# Performance improvement worklist

Findings from the 2026-10-17 review using the `optimize-javascript` skill, extended by a 2026-10-23 follow-up review (candidates 5 and 8). Candidates 1 and 2 are implemented and retained after measurement. Candidate 3 is partially evaluated: header transfer is retained, first-array adoption is rejected, and linear accumulation remains open. Candidate 8 is implemented and retained, and supersedes candidate 4. Candidates 5–7 remain open. Unchecked boxes represent work still to do. Work through each candidate independently.

**Priority (2026-10-23).** Candidate 8 has the largest expected gain: it targets the default multithreaded path, and a timing of main-thread chunking alone shows that the main thread, not the workers, bounds multithreaded `skip`. Among the remaining replay-side items, candidate 5 is the most promising because `actions` is the slowest mode and the one every move tracker uses. Candidates 3 (linear accumulation) and 4 only affect wrapped or very long movetext, which the Lichess benchmark fixture does not contain; candidate 6 only affects `tileTracker`; candidate 7 targets memory, not throughput. Candidate 8 would also make candidate 4 obsolete.

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

- [x] Verify the board-state invariant across successful replay, skipped replay, and replay failures.
- [x] Experiment with guarding the successful-game reset when replay is disabled.
- [x] Verify mixed runs, consecutive games, tracker end hooks, and `abort` / `skip-game` behavior.
- [x] Measure all replay modes in both execution paths and record the outcome below.

**Acceptance:** Counts, tracker state, and error behavior remain equivalent; count-only throughput improves beyond measured noise without regressing replay modes.

**Outcome:** Retained. Guarding the successful-game reset with `replayMode !== 'skip'` reduced single-threaded count-only elapsed time by 10–11% in both comparison orders. Successful replay and the existing failure handler still reset the context; skipped replay leaves it unchanged. Worker count-only runs also improved, with more timing variability. Other modes showed no consistent regression across the initial and reverse-order comparisons. See the [experiment record](#candidate-1-experiment-2026-10-17) for measurements and limits.

## 2. Recognize game results from the line suffix

**Evidence:** `extractGameResult()` accounted for approximately **7.7% of count-only profile samples**. It uses a regex search to recognize a terminator at the end of each cleaned movetext line.

**Code:** [movetext.ts](src/pgn/movetext.ts), consumed by [game-assembler.ts](src/pgn/game-assembler.ts) and [pgn-chunks.ts](src/io/pgn-chunks.ts).

- [x] Benchmark a suffix-oriented fast path against the existing regex on short and long lines, matches, misses, and trailing whitespace.
- [x] Preserve `1-0`, `0-1`, `1/2-1/2`, and `*`, including the current whitespace and suffix-matching semantics. Keep unrelated parser behavior changes separate.
- [x] Check empty lines, non-result endings, comments removed before detection, and chunk-boundary agreement with assembly.
- [x] Compare full analysis throughput in all modes and record the outcome.

**Acceptance:** Equivalent results and game boundaries, with a measurable gain on representative PGN input. Optimize result detection independently of SAN extraction; this finding does not justify replacing the tuned move regex.

**Outcome:** Retained. `trimEnd()` followed by four `endsWith()` checks preserves the existing result and whitespace semantics while avoiding the regex's search through the line. Node single-threaded count-only elapsed time decreased by 7.3% in the initial comparison and 9.5% in reverse order; board mode improved by 4.2–4.8%. Action-mode gains were smaller. Worker timings varied with comparison order, with no consistent regression. SAN extraction is unchanged. See the [experiment record](#candidate-2-experiment-2026-10-17) for the full matrix, Bun cross-check, and limits.

## 3. Avoid assembler copies

**Evidence:** The first movetext line concatenates its extracted moves onto an empty array. Completed headers are spread-copied immediately before the assembler clears its reference. Repeated concatenation also copies the growing move array on every additional movetext line, producing quadratic copying for heavily wrapped games.

**Code:** `GameAssembler.processLine()` in [game-assembler.ts](src/pgn/game-assembler.ts).

- [x] Benchmark adopting the first matched-moves array directly, keeping subsequent append behavior unchanged initially.
- [x] Independently benchmark transferring the completed headers object instead of cloning it; confirm the assembler never mutates that object afterward.
- [x] Verify retained games and headers remain independent across subsequent assembly, public parsing, filters, and game trackers.
- [x] Investigate linear accumulation for heavily wrapped games as a separate experiment, using the operation counts below.
- [x] Run `bun run bench:atomic -- array` before changing append patterns, then check large-file throughput in all modes.
- [ ] Benchmark linear accumulation end to end without first-array adoption (see outcome).

**Acceptance:** Preserve the existing common-case performance and ownership semantics. Any more complex multiline strategy must demonstrate better scaling without sacrificing the tuned single-line path. Keep internal moves as `string[]`; materialize `{ san }` only at existing public boundaries.

**Outcome:** Partially retained. **Header transfer is retained**: with `headers: true`, Node ST `skip` improved by 3.4% and 3.7% in both comparison orders and ST `board` by 2.7%; worker timings reversed with order. The assembler resets its reference immediately after hand-off, and `ParsedGame.headers` is typed `Readonly`, so consumers already cannot mutate it. **First-array adoption is rejected**: it showed no reliable gain in any mode, and `board` was slower in all four comparisons (ST +4.2% / +2.1%, MT +9.2% / +3.3%). `%DebugPrint` showed identical maps, elements kinds, and backing-store sizes for `match` and `concat` arrays, so the cause is unexplained. **Linear accumulation** (push into the owned array after the first line) removes the quadratic copying and is 31% faster on 8-line wrapped games in isolation, but was only measured on top of adoption; it remains open. See the [experiment record](#candidate-3-experiment-2026-10-23).

## 4. Stop rescanning unfinished chunks

**Status:** Superseded by candidate 8. The byte-level chunker scans only newly read lines while extending past its target. The checklist below describes the removed line-based chunker.

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

## 5. Reduce `actions`-mode overhead over `board`

**Evidence:** `actions` replays the same moves as `board` but costs far more: in the candidate 3 baseline, ST `actions` took 33.947 s against 19.286 s for `board`, about **14.7 s or ~108 ns per move** on 135,020,744 moves, with no trackers attached. The original finding (pooled-action deletes) is likely a small part of this. Two larger suspects, both from code inspection and not yet measured in isolation:

- **Coordinate round trip.** The shared resolver produces numeric coordinates; `SanDecoder` converts them to `Square` strings (`squareAt` / `coordsToSquare`); then `ChessBoard.applyActions()` converts them back with `squareToCoords`, looks up pieces again by name character code, and switches on `action.type` per action. `SanApplier` already mutates the board directly from the resolution. The decoder could do the same after `trackMoves` (trackers receive only actions, not the board) and skip `applyActions`.
- **Action hidden classes.** The pooled `captureAction` literal in `SanContext` has no `from` field, so the first capture adds it and transitions the shape; `enPassant` is then added and deleted per capture. Together with `moveAction`, `promoteAction`, and the per-castle literals (which add `castle`), sites reading `action.type` may see about five maps and go megamorphic, in `applyActions` and in every tracker. Confirm with `--trace-ic` or `%HaveSameMap` before relying on this.

The ordinary-move paths also repeatedly delete `moveAction.castle`, which the pooled object never has, while castling creates separate action objects. Capture actions add/delete `enPassant`. These operations occur in hot decoder methods, but their individual costs have not been isolated.

**Code:** [san-decoder.ts](src/replay/san-decoder.ts), [san-context.ts](src/replay/san-context.ts), [chess-board.ts](src/board/chess-board.ts) (`applyActions`), [game-replayer.ts](src/replay/game-replayer.ts), [actions.ts](src/types/actions.ts).

- [ ] Profile ST `actions` against `board` to attribute the per-move gap (decode, string conversion, `applyActions`, tracker dispatch).
- [ ] Benchmark applying board mutations from the resolver output in the decoder path instead of re-parsing actions in `applyActions`. Keep tracker-before-board ordering.
- [ ] Check action maps at `action.type` sites; benchmark declaring `from` in the pooled capture literal and stable-shape pooled objects.
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

## 8. Chunk raw bytes on the main thread

**Evidence:** In multithreaded mode the main thread decodes the whole file to UTF-16 strings, splits it into lines with readline, pushes every line into an accumulator, checks for a result, then joins each chunk and re-encodes it with `TextEncoder`. Workers decode and split the same text again ([chess-worker.ts](src/core/chess-worker.ts)). Draining `readPgnChunks` alone on the 1.86 GB cached fixture (Node, no workers, alternating order) took **2.93 s and 2.80 s**. Reading raw buffers and cutting at the last `\n\n[` took **0.75 s and 0.48 s**. MT `skip` takes about 3.6–4.1 s in total, so the main thread bounds it. Expected effect: large for MT `skip`, some for MT `board`, little for MT `actions`, which is likely already bound by the workers.

With Lichess-style lines (~46 bytes), the default `maxLines: 50_000` cap triggers before the 4 MiB byte target, so the current default chunks are about 2.6 MB (721 chunks versus 445 for byte-only cutting). The current byte count also uses UTF-16 length, not UTF-8 bytes.

**Code:** `readPgnChunks()` in [pgn-chunks.ts](src/io/pgn-chunks.ts), `processBatch()` in [chess-worker.ts](src/core/chess-worker.ts), transfer in [worker-pool.ts](src/core/worker-pool.ts).

- [x] Read the file as bytes and cut after the last line that completes a game, using the same `extractGameResult(stripComments(line))` test on decoded candidate lines only, so chunk boundaries agree with assembly.
- [x] Preserve line semantics in workers: readline also splits on `\r\n` and lone `\r`; the worker previously split on `\n` only.
- [x] Decide how `maxLines` / `minLines` and the byte target behave on raw bytes, and measure the cost of counting lines.
- [x] Transfer owned `ArrayBuffer`s only (never Node's shared `Buffer` pool), and keep chunk-level backpressure.
- [x] Verify game equivalence against single-threaded parsing (CRLF, BOM, multi-byte UTF-8 at read boundaries, Unicode whitespace after results, comments, incomplete trailing games, EOF without newline).
- [x] Benchmark MT in all modes with A/B order reversal.
- [ ] Re-check chunk-size tuning (`bench-chunk-sizes.ts`); the 2.5 MiB default only preserves the previous effective size.

**Acceptance:** Identical games, counts, and errors to single-threaded analysis; a measurable MT throughput gain in `skip`, with no regression in `board` / `actions`.

**Outcome:** Retained. `readPgnChunks` now reads raw bytes with a `FileHandle`, decodes only the lines it inspects backward from the target, and emits exactly sized owned buffers; workers decode and split with readline's terminators. Main-thread chunking on the cached fixture dropped from **2.80–2.93 s to 0.25 s** (warmed). In interleaved ABBA rounds, MT `skip` improved by **about 40%** (4.31 s → 2.52–2.62 s), MT `board` by **about 13%** (7.59–7.93 s → 6.62–6.74 s), and MT `actions` stayed within noise (−1%). The first baseline-then-candidate pass showed `board` / `actions` slower; reverse-order and ABBA rounds did not, so that pass is attributed to drift. `maxLines` / `minLines` now count lines only when set (counting costs about 1.1 s on this fixture); the implicit 50,000-line default cap is gone, and the default byte target is 2.5 MiB to keep the previous effective chunk size. Extension past the target scans only newly read lines, which also removes candidate 4's quadratic rescans. ST and Bun were not measured; the ST path does not use the changed code. See the [experiment record](#candidate-8-experiment-2026-10-23).

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

| Candidate / variant         | Baseline → candidate commits                           | Workload / runtime                                        | Before → after (mean, min, CV)                                                     | Correctness / scaling / memory evidence                                                      | Decision |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| 1: guard reset in skip mode | `af01dcb` → working-tree guard described below         | 1777.3 MiB, Node 26.10.0, ST + 8 workers                  | ST skip: 8.076 / 8.036 s / 0.69% → 7.257 / 7.243 s / 0.27%; full matrix below      | 222 tests pass; exact large-file counts; mixed-mode and failure-recovery coverage            | Retained |
| 3a: adopt first moves array | `f6cc403` → working-tree variant described below       | 1777.3 MiB, Node 26.12.1, ST + 8 workers                  | ST board: 19.286 / 19.169 s / 0.54% → 20.103 / 19.990 s / 0.52%; full matrix below | Exact large-file counts; no gain, `board` slower in all four comparisons                     | Rejected |
| 3b: transfer headers object | `f6cc403` → working-tree hand-off described below      | 1777.3 MiB, Node 26.12.1, `headers: true`, ST + 8 workers | ST skip: 9.978 / 9.952 s / 0.23% → 9.642 / 9.607 s / 0.38%; full matrix below      | 229 tests pass; exact large-file counts; header/move independence coverage                   | Retained |
| 8: byte-level chunking      | `b9ac194` → working-tree chunker described below       | 1777.3 MiB, Node 26.12.1, 8 workers                       | MT skip (ABBA): 4.307 / 4.226 s → 2.524 / 2.358 s; full matrix below               | 240 tests pass; exact large-file counts; ST-equivalence tests across fixtures and edge cases | Retained |
| 2: result suffix checks     | `917d121` → working-tree suffix checks described below | 1777.3 MiB, Node 26.10.0 + Bun 1.4.3, ST + 8 workers      | Node ST skip: 7.162 / 7.161 s / 0.04% → 6.637 / 6.583 s / 0.79%; full matrix below | 227 tests pass; exact large-file counts; Unicode suffix and chunk/assembly coverage          | Retained |

### Candidate 1 experiment: 2026-10-17

**Revisions and workload.** Baseline: `af01dcb3d1c300bb322a84c71dc6258f770ec921`. Candidate: that revision plus the guarded successful-game reset in `GameReplayer.processGame()`; no other production code changed. Candidate `src/replay/game-replayer.ts` SHA-256: `5ba35d07b857239f7be2707a7cf17a95e504ba429ef007e08d9ec9b231ebd3a7`. The test and documentation changes are outside the timed workload.

Runtime: Node `v26.10.0`, V8 `14.6.202.34-node.34`, Apple M1; workers used the default pool of 8. Input was the same 1777.3 MiB cached fixture as above. All timed runs returned **2,000,112 games and 135,020,744 moves**, asserted outside timing. Performance measurements cover Node; correctness tests ran on Bun `1.4.3`.

**Method.** Built both versions with `bun run build` and preserved their separate `lib/` trees. Used a temporary copy of [bench-perf.ts](bench/bench-perf.ts) with its `analyzePGN` import redirected to the selected built entry via `RESET_BUILD_ENTRY`; fixture resolution, workload, and timing helpers were unchanged. The copy also emitted raw samples and checked counts after timing. Invocations used `node --import tsx`, with fresh sequential processes and no overlapping benchmarks or tests.

The first pass ran baseline then candidate, with `skip`, `board`, and `actions` sequentially within each process, separately for ST and MT. Each scenario had one full-fixture warmup and two timed samples (`BENCH_RUNS=2`). A fresh-process baseline-only ST skip control measured 8.164 s mean, 8.122 s minimum, and 0.74% CV (samples: 8.121518, 8.206941 s). Its mean differed by about 1.1% from the first baseline, providing an A/A noise reference.

| Path / mode | Baseline mean / min / CV    | Candidate mean / min / CV   |
| ----------- | --------------------------- | --------------------------- |
| ST skip     | 8.076 s / 8.036 s / 0.69%   | 7.257 s / 7.243 s / 0.27%   |
| ST board    | 20.598 s / 20.545 s / 0.36% | 20.929 s / 20.791 s / 0.93% |
| ST actions  | 35.254 s / 35.214 s / 0.16% | 36.278 s / 36.057 s / 0.86% |
| MT skip     | 4.466 s / 4.404 s / 1.96%   | 4.082 s / 3.909 s / 6.01%   |
| MT board    | 7.618 s / 7.343 s / 5.11%   | 8.363 s / 8.305 s / 0.97%   |
| MT actions  | 14.268 s / 14.051 s / 2.16% | 14.619 s / 14.506 s / 1.09% |

Raw timed samples from that pass, in seconds:

| Path / mode | Baseline samples     | Candidate samples    |
| ----------- | -------------------- | -------------------- |
| ST skip     | 8.036297, 8.115360   | 7.271133, 7.243452   |
| ST board    | 20.650015, 20.545024 | 20.791447, 21.066296 |
| ST actions  | 35.214235, 35.294486 | 36.057211, 36.499308 |
| MT skip     | 4.403806, 4.527576   | 3.908668, 4.255647   |
| MT board    | 7.342556, 7.893381   | 8.419782, 8.305321   |
| MT actions  | 14.485633, 14.050672 | 14.506288, 14.731254 |

Because the first pass showed slower board/actions timings, the follow-up isolated each mode in fresh processes and reversed build order: **candidate then baseline, adjacent for each scenario**. Each process had one full-fixture warmup and one timed sample (`BENCH_RUNS=1`); CV is not meaningful for these individual samples.

| Path / mode | Candidate sample (first) | Baseline sample (second) |
| ----------- | -----------------------: | -----------------------: |
| ST skip     |               7.225841 s |               8.107646 s |
| ST board    |              20.368639 s |              20.733137 s |
| ST actions  |              34.749078 s |              34.811222 s |
| MT skip     |               3.916741 s |               4.969866 s |
| MT board    |               8.239148 s |               8.592186 s |
| MT actions  |              14.288156 s |              14.755583 s |

**Interpretation.** ST skip elapsed time decreased by 10.1% in the first comparison and 10.9% in the reverse-order comparison, exceeding the observed A/A drift. MT skip improved in both comparisons, but the samples are too variable to promise a precise worker speedup. Board/actions differences changed direction between passes; these measurements support no consistent regression, rather than a claim of improvement in those modes. The follow-up also changed mode isolation, so it does not identify whether drift or persistent runtime state caused the first-pass differences. No cold-start or Bun throughput claim is established.

**Correctness.** `bun run build && bun test`: 222 passed, 0 failed. `bun run typecheck`: passed. `bun run lint`: completed with the existing `unicorn/consistent-function-scoping` warning for `makeRow` in the unchanged tile-grid module. Added coverage for alternating skip/board/actions with game-end hooks; recovery after partially replayed games fail under both error policies; and mixed count-only/action runs in ST and a reused worker across small chunks. The measured production guard was unchanged after validation.

Local logs, the adapted harness, and frozen builds are under `/private/tmp/chessalyzer-reset-isysv3gn/`. They are temporary artifacts; the timings, revision identity, and reproduction method are recorded here so the outcome survives their removal.

### Candidate 2 experiment: 2026-10-17

**Revisions and workload.** Baseline: `917d1215234494983223ae3a74df0fa887b8f4c3`. Candidate: that revision plus `trimEnd()` and suffix checks in `extractGameResult()`; no other production code changed. Candidate `src/pgn/movetext.ts` SHA-256: `0a217e079d359fc616bbefc14ffd3ab046625991aa5e644851ae5b9b6699a809`. Tests, benchmark, and documentation changes are outside the timed workload.

Apple M1, Node `v26.10.0` / V8 `14.6.202.34-node.34`, Bun `1.4.3`; default pool of 8 workers. Input: `lichess_db_standard_rated_2014-09.pgn` concatenated twice, **1777.3 MiB, 2,000,112 games, 135,020,744 moves**. No trackers; all replay modes, ST and MT. Every timed analysis returned the expected counts, asserted after timing. Analysis used the default abort-on-error policy and completed without errors.

**Method.** Built baseline before changing production code and preserved its `lib/` tree; built and preserved the candidate separately. A temporary copy of [bench-perf.ts](bench/bench-perf.ts) selected the built entry with `RESULT_BUILD_ENTRY`, printed raw samples, and asserted counts outside timing. It retained the existing fixture resolution and timing helpers; helper imports were absolute so the temporary harness also ran under Bun. Each invocation was a fresh process (`node --import tsx` or `bun`); benchmarks and tests ran sequentially.

The initial Node pass used `BENCH_RUNS=3`, with one full-fixture warmup per scenario, in this order: baseline ST, baseline MT, candidate ST, candidate MT. Modes within each process were `skip`, `board`, `actions`. The workload and options match these existing benchmarks:

```sh
BENCH_RUNS=3 bun run bench:perf skip board actions --single-threaded
BENCH_RUNS=3 bun run bench:perf skip board actions
```

**Node initial comparison:**

| Path / mode | Baseline mean / min / CV    | Candidate mean / min / CV   |
| ----------- | --------------------------- | --------------------------- |
| ST skip     | 7.162 s / 7.161 s / 0.04%   | 6.637 s / 6.583 s / 0.79%   |
| ST board    | 20.407 s / 20.190 s / 0.93% | 19.560 s / 19.505 s / 0.34% |
| ST actions  | 34.884 s / 34.847 s / 0.09% | 34.215 s / 34.085 s / 0.63% |
| MT skip     | 3.944 s / 3.745 s / 4.46%   | 4.075 s / 3.764 s / 6.63%   |
| MT board    | 7.632 s / 7.127 s / 5.73%   | 8.159 s / 7.867 s / 3.52%   |
| MT actions  | 13.817 s / 13.396 s / 3.61% | 14.498 s / 14.362 s / 0.98% |

A fresh-process unchanged-build ST skip control after that pass measured **7.493 s mean, 7.366 s minimum, 2.90% CV**, about 4.6% slower than the first baseline. This indicates drift beyond the initial within-process variation; the first-pass worker differences should not be attributed solely to the change.

The follow-up isolated each mode in fresh processes and reversed order: **candidate then baseline, adjacent for each scenario**, ST modes first, then MT. Each process used one full-fixture warmup and one timed sample (`BENCH_RUNS=1`); CV is not meaningful for individual samples.

| Path / mode | Candidate sample (first) | Baseline sample (second) |
| ----------- | -----------------------: | -----------------------: |
| ST skip     |               6.631705 s |               7.332042 s |
| ST board    |              19.512351 s |              20.498416 s |
| ST actions  |              34.410105 s |              34.521367 s |
| MT skip     |               3.680363 s |               4.052595 s |
| MT board    |               7.051363 s |               8.066838 s |
| MT actions  |              14.163444 s |              14.283516 s |

**Bun cross-check.** Baseline ST, baseline MT, candidate ST, candidate MT, with `BENCH_RUNS=2` and one warmup per mode. No separate Bun A/A control was recorded. Follow-up worker board/actions checks reversed order with one warmup and one timed sample per fresh process.

| Path / mode | Baseline mean / min / CV    | Candidate mean / min / CV   |
| ----------- | --------------------------- | --------------------------- |
| ST skip     | 10.275 s / 10.268 s / 0.10% | 8.650 s / 8.506 s / 2.35%   |
| ST board    | 20.205 s / 20.199 s / 0.04% | 19.527 s / 19.420 s / 0.78% |
| ST actions  | 29.548 s / 29.450 s / 0.47% | 28.823 s / 28.799 s / 0.12% |
| MT skip     | 7.260 s / 7.035 s / 4.39%   | 6.919 s / 6.789 s / 2.66%   |
| MT board    | 9.345 s / 9.323 s / 0.33%   | 9.415 s / 9.378 s / 0.56%   |
| MT actions  | 11.878 s / 11.781 s / 1.15% | 12.190 s / 12.187 s / 0.03% |

| Path / mode | Candidate sample (first) | Baseline sample (second) |
| ----------- | -----------------------: | -----------------------: |
| MT board    |               8.273354 s |               9.422737 s |
| MT actions  |              11.329992 s |              12.194225 s |

**Focused reproduction.** [bench-result-suffix.ts](bench/exploratory/bench-result-suffix.ts) compares the original regex with the production helper on short and long strings, all four results, misses, and trailing ASCII/Unicode whitespace. Short strings use one movetext prefix; long strings repeat that prefix 100 times. It validates outputs and consumes result lengths as a checksum. Each timed sample performs 400,000 extractions; three samples plus a warmup per variant, with regex/suffix then suffix/regex order.

```sh
node --import tsx bench/exploratory/bench-result-suffix.ts
bun bench/exploratory/bench-result-suffix.ts
```

Long-line cases improved substantially in both runtimes. Short-line cases were generally faster, but **Bun short misses with trailing whitespace regressed**: approximately 14.0 ms for the regex versus 19.4 ms for suffix checks in round two. Node's corresponding case was close (12.5 versus 11.8 ms). The first short-match suffix rounds had elevated CV despite warmup; raw samples retain these outliers. These microbenchmarks explain the avoided scan, but do not predict full-pipeline speedups.

**Correctness.** All **227 tests passed**, including direct suffix/miss/comment checks, differential comparison with the original regex across all 65,536 UTF-16 code units after each result, and chunk/assembler agreement at byte thresholds, line thresholds, and EOF. Differential coverage includes Unicode whitespace and line terminators, non-whitespace, and surrogate code units. The implementation preserves suffix matching without a preceding token boundary and keeps comment removal at the existing caller boundary. Build, typecheck, and lint passed. The measured production helper was unchanged after validation.

**Decision.** Retained. Node ST skip improved by **7.3% initially and 9.5% in reverse order**; ST board improved by **4.2% and 4.8%**. ST actions improved by **1.9% and 0.3%**, so its gain is smaller and less certain. Initial Node worker samples were slower, while all adjacent reverse-order worker comparisons were faster; no precise worker speedup or consistent regression is established. Bun ST improved in all modes (skip **15.8%**, board **3.4%**, actions **2.5%**) in its single comparison order. Bun worker board/actions differences also reversed in the adjacent follow-up. Follow-ups changed mode isolation as well as order, so they do not distinguish timing drift from persistent runtime state. These conclusions apply to this fixture and machine; heavily wrapped, whitespace-heavy inputs may have a different balance of short misses.

All raw timed samples, means, minima, standard deviations, and CVs are preserved in [result-suffix-2026-10-17.jsonl](bench/exploratory/results/result-suffix-2026-10-17.jsonl), with baseline revision, candidate source hash, runtime, and fixture metadata. Baseline/candidate builds and the temporary full-analysis harness remain machine-local under `/private/tmp/chessalyzer-result-suffix/`.

### Candidate 3 experiment: 2026-10-23

**Revisions and workload.** Baseline: `f6cc403d49238edca250383bbdbf6669fbe3ed0f`. Variant A (rejected) replaced the append with `moves.length === 0 ? matchedMoves : moves.concat(matchedMoves)`. Variant B (retained) assigns `this.headers` to the completed game instead of `{ ...this.headers }`; final `src/pgn/game-assembler.ts` SHA-256: `5b8e9b227156741146de5389ee263935c5073d3e69b3fa1585a0dc04d5854d7b`. Each variant was applied to the baseline alone and built separately.

Apple M1, Node `v26.12.1`; default pool of 8 workers. Input: the same 1777.3 MiB cached fixture (**2,000,112 games, 135,020,744 moves**), counts asserted after every timed run. No trackers. Variant B used `headers: true` because the default benchmark does not parse headers and cannot observe it. No Bun measurements were taken.

**Method.** The baseline and both variants were built with `bun run build` and their `lib/` trees preserved. A temporary harness imported `analyzePGN` from the selected built entry, printed raw samples, and asserted counts. Pass 1 ran baseline then candidate with one warmup and `BENCH_RUNS=3`, with modes sequential within a process. The reverse pass ran candidate then baseline, one mode per fresh process, with one warmup and one sample. A fresh-process baseline ST skip A/A control measured **6.570 s mean** against 6.546 s in pass 1 (0.4% drift). `bun run bench:atomic -- array` ran first: for a single 20-item append into a fresh array, `concat` (27.9M ops/s) beat `push(...)` (21.3M ops/s).

**Variant A: adopt the first matched-moves array.**

| Path / mode | Baseline mean / min / CV    | Candidate mean / min / CV   | Reverse: candidate → baseline |
| ----------- | --------------------------- | --------------------------- | ----------------------------- |
| ST skip     | 6.546 s / 6.528 s / 0.19%   | 6.610 s / 6.581 s / 0.33%   | 6.509 s → 6.558 s             |
| ST board    | 19.286 s / 19.169 s / 0.54% | 20.103 s / 19.990 s / 0.52% | 20.031 s → 19.616 s           |
| ST actions  | 33.947 s / 33.923 s / 0.10% | 35.040 s / 34.940 s / 0.23% | 34.044 s → 33.943 s           |
| MT skip     | 4.132 s / 3.913 s / 3.77%   | 4.181 s / 4.067 s / 1.95%   | 3.588 s → 3.851 s             |
| MT board    | 7.184 s / 7.038 s / 1.47%   | 7.843 s / 7.750 s / 1.18%   | 7.374 s → 7.137 s             |
| MT actions  | 12.574 s / 12.523 s / 0.29% | 12.937 s / 12.868 s / 0.53% | 13.360 s → 13.405 s           |

`skip` and `actions` changed direction with order. `board` was slower in every comparison. Lichess movetext is single-line, so this variant removed one 60–120 element copy per game; that saving did not appear in `skip`, where parsing dominates.

**Variant B: transfer the headers object (`headers: true`).**

| Path / mode                        | Baseline mean / min / CV    | Candidate mean / min / CV   |
| ---------------------------------- | --------------------------- | --------------------------- |
| ST skip                            | 9.978 s / 9.952 s / 0.23%   | 9.642 s / 9.607 s / 0.38%   |
| ST board                           | 23.335 s / 23.281 s / 0.17% | 22.709 s / 22.692 s / 0.07% |
| MT skip                            | 4.937 s / 4.668 s / 4.21%   | 5.125 s / 4.962 s / 2.32%   |
| ST skip (reverse: candidate first) | 10.085 s / 10.056 s / 0.30% | 9.708 s / 9.639 s / 0.84%   |
| MT skip (reverse: candidate first) | 5.426 s / 5.394 s / 0.61%   | 4.988 s / 4.754 s / 3.43%   |

ST improved in both orders, by more than the A/A drift. Worker timings reversed with order and establish neither a gain nor a regression.

**Linear accumulation.** [bench-assembler-copies.ts](bench/exploratory/bench-assembler-copies.ts) compares `concat`, `adopt`, and `adopt_push` (adopt the first array, then push later lines' tokens in a loop; spread is avoided for very long lines). It reproduces the operation counts above: copied elements per game for 1,000 / 2,000 / 4,000 stress lines were 1,001,000 / 4,002,000 / 16,004,000 for `concat` and 1,998 / 3,998 / 7,998 for `adopt_push`. Timings (200,000 games, Node):

| Workload                      |  concat |   adopt | adopt_push |
| ----------------------------- | ------: | ------: | ---------: |
| single line, 40 moves         | 0.126 s | 0.122 s |    0.122 s |
| 8 wrapped lines, 40 moves     | 0.269 s | 0.266 s |    0.184 s |
| 4,000 stress lines (20 games) | 0.167 s | 0.167 s |    0.005 s |

Because adoption regressed `board` end to end, a follow-up should benchmark linear accumulation that keeps the baseline's first-line `concat` and pushes only on later lines. The Lichess fixture is single-line and would not exercise that path, so a wrapped-movetext fixture is also needed.

**Correctness.** `bun run build && bun test`: 229 passed, 0 failed. Typecheck and lint passed. Added coverage for wrapped movetext order across comment-stripped lines and for independent headers and move arrays across consecutive games.

All raw samples are preserved in [assembler-copies-2026-10-23.jsonl](bench/exploratory/results/assembler-copies-2026-10-23.jsonl).

### Candidate 8 experiment: 2026-10-23

**Revisions and workload.** Baseline: `b9ac194133b678a57a874a9abc78389341c72b9a`. Candidate: that revision plus byte-level `readPgnChunks` and worker-side line splitting. Candidate SHA-256: `src/io/pgn-chunks.ts` `9722511b5ac78ae8c051136912dc6e8903dd415a9fdab7769147defa568add97`, `src/core/chess-worker.ts` `cea6d8fd5119298da0787a7f49228e0fba3571595ab6c2450bb477804f03e85e`. Apple M1 (4 performance + 4 efficiency cores), Node `v26.12.1`, default pool of 8 workers, no trackers. Input: the same 1777.3 MiB cached fixture; every timed run asserted **2,000,112 games and 135,020,744 moves** after timing.

**Method.** Built the baseline before changing production code and preserved its `lib/`; built and preserved the candidate separately. A temporary harness imported `analyzePGN` from the selected build, ran one warmup per mode, and printed raw samples. Pass 1 ran baseline then candidate (`BENCH_RUNS=3`, modes sequential per process). The reverse pass ran candidate then baseline for `board` and `actions`, one mode per process. Final ABBA rounds ran baseline, candidate, candidate, baseline per mode, each a fresh process with `BENCH_RUNS=2`.

Main-thread chunking alone, warmed, `BENCH_RUNS=2` ([bench-pgn-chunking.ts](bench/exploratory/bench-pgn-chunking.ts)): defaults **0.247 s** mean (0.244 s min, 1.5% CV); `maxLines: 50_000` **1.383 s** (0.8% CV). The baseline line-based chunker took 2.93 s and 2.80 s in single cold runs from a scratch harness; raw file read was 0.28 s min, with a cold first sample.

| Pass / mode                          | Baseline mean / min / CV    | Candidate mean / min / CV   |
| ------------------------------------ | --------------------------- | --------------------------- |
| Pass 1 MT skip                       | 4.059 s / 4.019 s / 0.91%   | 2.579 s / 2.489 s / 2.46%   |
| Pass 1 MT board                      | 6.510 s / 6.390 s / 1.39%   | 6.760 s / 6.489 s / 4.85%   |
| Pass 1 MT actions                    | 11.989 s / 11.880 s / 1.07% | 12.552 s / 12.383 s / 0.97% |
| Reverse MT board (candidate first)   | 7.521 s / 7.333 s / 1.78%   | 6.187 s / 6.059 s / 1.85%   |
| Reverse MT actions (candidate first) | 13.133 s / 12.865 s / 1.49% | 12.837 s / 12.557 s / 1.62% |
| ABBA MT skip (A1 / A2 vs B1 / B2)    | 4.307 / 4.308 s             | 2.524 / 2.624 s             |
| ABBA MT board                        | 7.585 / 7.930 s             | 6.740 / 6.624 s             |
| ABBA MT actions                      | 13.332 / 13.372 s           | 13.240 / 13.096 s           |

**Interpretation.** MT `skip` improved in every comparison, by 36–41%. MT `board` improved in the reverse pass and in both ABBA pairs, by 11–18%, but was 3.8% slower in pass 1; the baseline itself moved 15% between passes, so pass 1 is treated as drift. MT `actions` differences (−4.7% to +2%) stay within noise; that mode is bound by the workers. No Bun, ST, or cold-start claims are made.

**Correctness.** `bun run build && bun test`: 240 passed, 0 failed. Typecheck and lint passed. New coverage compares chunked assembly with single-threaded `readLines` assembly for eight fixtures under five chunk configs, plus a synthetic file with BOM, CRLF, lone CR, Unicode whitespace after results, multi-byte comments larger than a read, and no final newline; line-capped extension of a long game; owned-buffer transfer; and missing-file rejection. A UTF-8 BOM was dropped in MT (before and after this change) but parsed as movetext by the ST line reader; that ST bug was fixed separately in `openLineStream`, and the equivalence test now requires identical games.

All raw samples are in [pgn-byte-chunks-2026-10-23.jsonl](bench/exploratory/results/pgn-byte-chunks-2026-10-23.jsonl).
