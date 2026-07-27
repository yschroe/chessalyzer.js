# Ideas & future work

Forward-looking notes on what chessalyzer.js does **not** do today, and plausible directions for extending it. This is not a committed roadmap — items may be reordered, dropped, or implemented differently.

For what exists now, see [README.md](./README.md) and [AGENTS.md](./AGENTS.md).

---

## Current scope (baseline)

Today the library is optimized for **batch analysis**, not general-purpose PGN I/O:

- Single public entry point: `analyzePGN(path, options?)`
- Internal pipeline: stream lines → tokenize movetext → **always replay SAN on a board** → optionally run trackers
- Fast path when no move trackers: `SanApplier` (direct board mutation, no `Action` objects)
- Tracker path: `SanToActions` → `Action[]` → `board.applyActions()`
- Assumes **standard chess from the initial position**, **valid Lichess-style PGN**, **mainline only** (parentheses stripped)

There is no exported parse API, no configurable parsing mode, and no move legality validation beyond disambiguation heuristics.

---

## Parsing pipeline modes (proposed)

The biggest gap is that parsing depth is implicit. A explicit **`ParseConfig`** (or similar) could let callers choose how much work to do per game, independent of trackers.

### Suggested tiers

| Mode                  | Input → output                                                  | Board replay                 | Typical use                                      |
| --------------------- | --------------------------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| **tokenize**          | Raw PGN lines → `{ moves: string[] }` per game                  | No                           | Counting moves, indexing, checksums              |
| **parse**             | PGN → `{ headers, moves: string[], result?, comments?, nags? }` | No                           | Filters on headers, export, databases            |
| **replay (trust)**    | SAN strings → updated board state                               | Yes, assume PGN is correct   | Current default; max throughput on Lichess dumps |
| **replay (validate)** | SAN → legal move resolution                                     | Yes, reject/skip illegal SAN | Untrusted input, correctness tooling             |
| **replay (actions)**  | SAN → `Action[]` with from/to coords                            | Yes                          | Move trackers, heatmaps, custom analysis         |

These could compose. Example:

```ts
// Hypothetical — not implemented
parsePGN(path, {
    mode: 'parse', // stop after structural parse
    headers: true,
    comments: false,
    variations: false,
});

parsePGN(path, {
    mode: 'replay',
    validation: 'trust', // 'trust' | 'validate' | 'skip-illegal'
    output: 'actions', // 'none' | 'board' | 'actions' | 'uci'
});
```

### Trust vs validate

|               | **Trust mode** (today)               | **Validate mode** (missing)                                                            |
| ------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| Assumption    | Database PGN is well-formed          | Input may be wrong or adversarial                                                      |
| Ambiguous SAN | `PieceFinder` picks a matching piece | Generate legal moves, match SAN uniquely                                               |
| Illegal move  | May throw or corrupt board state     | Skip move, skip game, or collect error                                                 |
| Castling / EP | Applied if SAN parses                | Verify castling rights, en passant legality                                            |
| Performance   | ~16M moves/s (M1, multithreaded)     | Expect large regression (cf. `pgn-reader` validate ≈2× slower than stats-only in Rust) |

Trust mode is the right default for batch stats on Lichess exports. Validate mode would be opt-in for interactive tools, importers, and fuzz/corpus hardening.

### Output shapes (missing public types)

Beyond the minimal internal `Game` type (`moves: string[]`, optional `Result` / `ECO`):

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
| **NAGs** (`$1`, `$3`, Unicode `!`, `??`)    | Not tokenized; lost with movetext    | Useful for quality / annotation stats                   |
| **Comments** `{ … }`                        | Stripped, not exposed                | Lichess eval/clock tags (`[%eval]`, `[%clk]`) live here |
| **`0-0` castling**                          | Not recognized (`O-O` only)          | Common typo in some exports                             |
| **Non–double-quoted headers**               | `parseHeaderTag()` skips them        | PGN spec allows other quoting                           |
| **Games without result line**               | Dropped at chunk boundaries          | Trailing incomplete games silently lost                 |
| **BOM / weird whitespace**                  | Mostly tolerated                     | Not explicitly handled everywhere                       |

### Partial / implicit

- **Headers** — only read when a game tracker or filter is present (`readInHeader` is internal)
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

| Behavior          | Today                           | Could become                                          |
| ----------------- | ------------------------------- | ----------------------------------------------------- |
| Read headers      | Auto if filter / game tracker   | `parseConfig.headers: true \| false \| 'filter-only'` |
| Worker-side parse | Auto unless filter / `cntGames` | Explicit `parseLocation: 'main' \| 'worker'`          |
| Comment handling  | Always strip                    | `'strip' \| 'preserve' \| 'parse-commands'`           |
| Variations        | Always strip (parens)           | `'strip' \| 'mainline-only' \| 'tree'`                |
| Error policy      | Abort entire run                | `'abort' \| 'skip-game' \| 'skip-move' \| 'collect'`  |

---

## Board & move representation

- **UCI output** — `e2e4`, `e7e8q` alongside or instead of `Action[]`
- **FEN after each move** — optional; expensive but useful for debugging
- **Castling rights / en passant square** — not tracked on `ChessBoard` today; required for strict validation and FEN export
- **Chess960** — different castling semantics; separate board or rules adapter
- **Castling double-count** — `SanToActions.castle()` emits two `move` actions; `TileTracker` has a TODO to treat castling as one move

---

## Error handling & robustness

- **Per-game isolation** — one bad game should not abort a million-game run (configurable)
- **Structured errors** — return `{ ok, errors[] }` instead of logging + rethrow in `GameReplayer.processGame()`
- **Corpus-driven hardening** — extend `test/corpus/` with RAV, FEN, variant, and intentionally illegal fixtures once validate mode exists
- **DoS resistance** — budget limits for comment depth, variation depth, game length (cf. chessops `PgnParser` budget)

---

## Multithreading & workers

From CHANGELOG / known limitations:

- Lazy worker creation (don't spawn `availableParallelism()` threads for small files)
- Send tracker config once per worker instead of per batch
- Defer result merging where possible
- Custom tracker `workerModule` + dynamic `import()` remains hacky; document or replace with a registration API

---

## Performance & benchmarking

- **Cross-parser benchmark harness** — same Lichess fixture, defined tiers (tokenize / parse / replay / validate), compare against chessops, `pgn-parser`, Rust `pgn-reader` / shakmaty
- **Published benchmark table** in README with methodology (hardware, fixture, mode definitions)
- **Single-threaded vs multithreaded** breakdown in `bench:perf` output
- **Regression CI** — optional job when `pgn/` fixture is present (too large for default CI)

---

## Ecosystem & packaging

- **Subpath exports** — e.g. `chessalyzer.js/pgn`, `chessalyzer.js/board` for advanced users without bloating default import
- **Browser build** — WASM or lightweight bundle if parse-only mode exists (no `worker_threads`)
- **Write PGN** — out of scope today; only mentioned if parse tree exists

---

## Priority sketch (informal)

If the goal is “PGN library” rather than “batch analyzer only”, a reasonable order:

1. **Public parse API** with `tokenize` and `parse` modes (no replay)
2. **Explicit replay config** — document today’s behavior as `trust`; keep as default
3. **Error policy** — `skip-game` for production batch runs
4. **Comment / NAG preservation** (optional flag)
5. **Validate mode** — correctness path, slower
6. **RAV / FEN / variants** — larger design effort

---

## Related issues in code today

| Location                                | Note                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `src/tracker/tile/tile-tracker-base.ts` | TODO: castling counted as two moves                                          |
| `src/types/analysis-runtime.ts`         | Processor-only config/state (split from public analysis types)               |
| `src/replay/replay-policy.ts`           | Internal `SKIP_REPLAY_WITHOUT_MOVE_TRACKERS` defaults false — opt-in skip    |
| `src/core/analyze.ts`                   | Errors attributed to “bug or unknown PGN format” — no structured diagnostics |
| `src/pgn/movetext-tokenizer.ts`         | RAVs and comments share the same strip regex                                 |
