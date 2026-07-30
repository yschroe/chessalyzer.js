# Ideas & future work

Forward-looking notes on what chessalyzer.js does **not** do today, and plausible directions for extending it. This is not a committed roadmap — items may be reordered, dropped, or implemented differently.

For what exists now, see [README.md](./README.md) and [AGENTS.md](./AGENTS.md). **Pipeline naming:** [Sprint 11](sprints/sprint-11-pipeline-terminology.md) is the source of truth for stage terminology (I/O → PGN parse → replay → analyze).

---

## Current scope (baseline)

Today the library is optimized for **batch analysis**, not general-purpose PGN I/O:

- Single public entry point: `analyzePGN(path, options?)`
- Internal pipeline: I/O (stream lines) → PGN parse → replay when needed → analyze (trackers)
- Count-only runs (no move trackers): board replay skipped by default; move counts come from the parsed SAN list length
- When replay runs without move trackers: `SanApplier` (direct board mutation, no `Action` objects)
- Tracker path: `SanDecoder` → `Action[]` → `board.applyActions()`
- Assumes **standard chess from the initial position**, **valid Lichess-style PGN**, **mainline only** (parentheses stripped)

There is no exported parse API, no configurable parsing mode, and no move legality validation beyond disambiguation heuristics.

---

## Parsing pipeline modes (proposed)

The biggest gap is that parsing depth is implicit. A explicit **`ParseConfig`** (or similar) could let callers choose how much work to do per game, independent of trackers.

### Suggested tiers

| Mode                  | Input → output                                                | Board replay                 | Typical use                                      |
| --------------------- | ------------------------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| **PGN parse**         | PGN lines → `{ moves: string[], headers?, result? }` per game | No                           | Move counts, header filters, indexing, export    |
| **replay (trust)**    | SAN strings → updated board state                             | Yes, assume PGN is correct   | Current default; max throughput on Lichess dumps |
| **replay (validate)** | SAN → legal move resolution                                   | Yes, reject/skip illegal SAN | Untrusted input, correctness tooling             |
| **replay (actions)**  | SAN → `Action[]` with from/to coords                          | Yes                          | Move trackers, heatmaps, custom analysis         |

These could compose. Example:

```ts
// Hypothetical — not implemented
parsePGN(path, {
    headers: true, // tag pairs; false = mainline SAN + result only
    comments: false,
    variations: false,
});

analyzePGN(path, {
    replay: 'actions', // 'skip' | 'board' | 'actions'
    validation: 'trust', // 'trust' | 'validate' (future)
});
```

### Trust vs validate

|               | **Trust mode** (today)               | **Validate mode** (missing)                                                   |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| Assumption    | Database PGN is well-formed          | Input may be wrong or adversarial                                             |
| Ambiguous SAN | `PieceFinder` picks a matching piece | Generate legal moves, match SAN uniquely                                      |
| Illegal move  | May throw or corrupt board state     | Skip move, skip game, or collect error                                        |
| Castling / EP | Applied if SAN parses                | Verify castling rights, en passant legality                                   |
| Performance   | ~16M moves/s (M1, multithreaded)     | Expect large regression (validation is typically much slower than parse-only) |

Trust mode is the right default for batch stats on Lichess exports. Validate mode would be opt-in for interactive tools, importers, and fuzz/corpus hardening.

### Output shapes (missing public types)

Beyond the public {@link ParsedGame} shape (`moves`, optional `result` / `headers`):

- **`ParsedGame`** — typed headers (`Map<string, string>` or record), mainline SAN list, game result, optional metadata
- **`ReplayedGame`** — final FEN, move list as UCI/from-to, or `Action[]` per half-move
- **`ParseError`** — game index, move index, SAN token, reason (`IllegalMove`, `AmbiguousSan`, `UnknownToken`, …)
- **Streaming iterator** — `for await (const game of parsePGN(path, config))` instead of all-or-nothing

---

## PGN format support gaps

### Not supported today

| Feature                                     | Current behavior                     | Notes                                                   |
| ------------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| **RAVs / variations** `( … )`               | Stripped by `stripComments()`        | Effectively mainline-only; no variation tree            |
| **FEN / `[SetUp "1"]`**                     | Ignored; board always standard start | Needed for puzzles, studies, partial games              |
| **Variants** (`[Variant "Chess960"]`, etc.) | Ignored                              | Would need variant-specific rules                       |
| **NAGs** (`$1`, `$3`, Unicode `!`, `??`)    | Not extracted; lost with movetext    | Useful for quality / annotation stats                   |
| **Comments** `{ … }`                        | Stripped, not exposed                | Lichess eval/clock tags (`[%eval]`, `[%clk]`) live here |
| **`0-0` castling**                          | Not recognized (`O-O` only)          | Common typo in some exports                             |
| **Non–double-quoted headers**               | `parseHeaderTag()` skips them        | PGN spec allows other quoting                           |
| **Games without result line**               | Dropped at chunk boundaries          | Trailing incomplete games silently lost                 |
| **BOM / weird whitespace**                  | Mostly tolerated                     | Not explicitly handled everywhere                       |

### Partial / implicit

- **Headers** — parsed when `headers: true` or a game tracker is present (`'auto'`); filters that read tag pairs need `headers: true`
- **Promotions, en passant, castling** — handled in replay path for standard chess
- **Move suffixes** `+`, `#`, `?`, `!` — stripped from SAN tokens before replay

---

## Public API ideas

### Standalone parse entry points

Split “parse PGN” from “run trackers”:

- `parsePGN(path, parseConfig)` → async iterator or promise of stats
- `analyzePGN(...)` → `parsePGN` + trackers (current behavior, refactored)

Benefits: users who only need move counts or header filters do not pay for board replay; easier testing; clearer semantics.

### Streaming & memory

Internal pieces already exist but are not exported:

- `readLinesFast()` — line streaming
- `readPgnChunks()` — byte-chunk streaming aligned to game boundaries
- `parseGamesFromLines()` — incremental game assembly

Ideas:

- Export a **`PgnStream`** / **`GameIterator`** for large files
- Optional **backpressure** when consumer is slower than reader
- **Byte-range** or **game-index** seek for very large archives (future)

### Configuration surfacing

Today several behaviors are hardcoded or inferred:

| Behavior         | Today                                       | Could become                                          |
| ---------------- | ------------------------------------------- | ----------------------------------------------------- |
| Read headers     | `'auto'` from game trackers only            | `parseConfig.headers: true \| false \| 'filter-only'` |
| Game filter      | JS function only; requires `workers: false` | Serializable filter DSL (see below) for MT            |
| Comment handling | Always strip                                | `'strip' \| 'preserve' \| 'parse-commands'`           |
| Variations       | Always strip (parens)                       | `'strip' \| 'mainline-only' \| 'tree'`                |
| Error policy     | `'abort'` or `'skip-game'` (shipped)        | `'skip-move'`, richer collect modes                   |

---

## Board & move representation

- **UCI output** — `e2e4`, `e7e8q` alongside or instead of `Action[]`
- **FEN after each move** — optional; expensive but useful for debugging
- **Castling rights / en passant square** — not tracked on `ChessBoard` today; required for strict validation and FEN export
- **Chess960** — different castling semantics; separate board or rules adapter

**Done:** `TileTracker` counts castling as one move (rook leg excluded from move counter; king/rook grid updates still apply both legs).

---

## Error handling & robustness

**Shipped:** `onError: 'abort' | 'skip-game'`, typed `AnalyzeError` / `ReplayError`, per-game skip with collected errors on `AnalyzeResult`.

Still open:

- **Corpus-driven hardening** — extend `test/corpus/` with RAV, FEN, variant, and intentionally illegal fixtures once validate mode exists
- **DoS resistance** — budget limits for comment depth, variation depth, game length

---

## Multithreading & workers

**Shipped:** lazy worker pool, tracker config once per worker via `workerData`, `trackerId` + `workerModule` for custom trackers; MT contract documented in README + AGENTS.md; deferred tracker merge at pool drain (Sprint 07). **JavaScript `filter` callbacks require `workers: false`** (v4) — they cannot be serialized to workers.

Still open:

- Replace custom tracker `workerModule` dynamic import with a registration API (optional ergonomics)

### Serializable filters (MT-friendly)

Today `filter` is a main-thread-only JS predicate (`(game: ParsedGame) => boolean`). That forces single-threaded analysis for any filtered run. For large PGNs, filtered stats (e.g. Elo band, result, date range) are a common use case and should not give up worker parallelism.

**Direction:** add a **serializable filter** form that workers (or a shared pre-filter pass) can evaluate without shipping a closure:

```ts
// Hypothetical — not implemented
type GameFilter =
    | ((game: ParsedGame) => boolean) // main thread only; implies workers: false
    | SerializableGameFilter;

interface SerializableGameFilter {
    /** Header tag predicate, e.g. { WhiteElo: { gt: 2000 } } */
    headers?: Record<string, HeaderPredicate>;
    result?: '1-0' | '0-1' | '1/2-1/2' | ('1-0' | '0-1' | '1/2-1/2')[];
    minMoves?: number;
    maxMoves?: number;
}

// Ideal UX: both shapes accepted on filter:
analyzePGN(path, {
    filter: (game) => Number(game.headers?.WhiteElo) > 2000, // ST
});
analyzePGN(path, {
    filter: { headers: { WhiteElo: { gt: 2000 } } }, // MT OK
});
```

**Dual-mode contract (target):**

| Form                | Workers                                | Notes                                                          |
| ------------------- | -------------------------------------- | -------------------------------------------------------------- |
| JS function         | `workers: false` only (enforced today) | Full expressiveness; closure over outer scope                  |
| Serializable object | Default worker pool OK                 | Fixed vocabulary; documented ops; no arbitrary code in workers |

Normalization would branch on filter shape: functions → existing ST path; serializable → worker-safe eval (built-in interpreter, no `eval`). Header-based filters imply `headers: true` (or auto-infer when serializable filter references tags).

**Open design questions:**

- Predicate vocabulary — start minimal (`eq`, `gt`, `lt`, `in`, `and`/`or`) vs a small JSON-logic subset
- Whether serializable filters run on workers during chunk replay or as a cheap post-parse gate before replay
- Multi-run: mixed ST function filter on one run + serializable on another — likely reject or require all runs use the same filter class per call

This keeps v4 honesty (no pretending JS filters are worker-native) while leaving a clear path to MT filtered analysis without breaking callers who already use function filters with `workers: false`.

---

## Performance & benchmarking

- **Cross-parser benchmark harness** — same Lichess fixture, defined tiers (PGN parse / replay / validate), compare against other PGN parsers
- **Published benchmark table** in README with methodology (hardware, fixture, mode definitions)
- **Single-threaded vs multithreaded** breakdown in `bench:perf` output
- **Regression CI** — optional job when `pgn/` fixture is present (too large for default CI)

---

## Ecosystem & packaging

- **Subpath exports** — `chessalyzer.js/io`, `/pgn`, `/replay`, `/trackers` (shipped); optional `/board` later for advanced users without bloating the default import
- **Browser build** — WASM or lightweight bundle if parse-only mode exists (no `worker_threads`)
- **Write PGN** — out of scope today; only mentioned if parse tree exists

---

## Priority sketch (informal)

If the goal is “PGN library” rather than “batch analyzer only”, a reasonable order:

1. **Public parse API** — `parsePGN` with optional headers (PGN parse stage; no replay)
2. **Explicit replay config** — document today’s behavior as `trust`; keep as default
3. **Error policy** — ~~`skip-game` for production batch runs~~ (shipped in v4)
4. **Comment / NAG preservation** (optional flag)
5. **Validate mode** — correctness path, slower
6. **RAV / FEN / variants** — larger design effort

---

## Related issues in code today

| Location                    | Note                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| `src/pgn/movetext.ts`       | RAVs and comments share the same strip regex                        |
| `src/replay/replay-mode.ts` | `SKIP_REPLAY_WITHOUT_MOVE_TRACKERS` defaults true (count-only skip) |
