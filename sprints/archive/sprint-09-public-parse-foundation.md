# Sprint 09 — Public parse foundation

**Effort:** Small (remaining gaps after Sprint 11)  
**Impact:** High — foundation for IDEAS “PGN library” direction  
**Depends on:** [Sprint 11 — Pipeline terminology & v4 API](./sprint-11-pipeline-terminology.md)

> **Note:** Most of this sprint is absorbed by Sprint 11 (`parsePGN`, `ParsedGame`, pipeline glossary, rename map). Keep this file for follow-up items only.

## Goal

Split “parse PGN” from “run trackers” with a minimal public API — no validate mode or RAV trees yet.

## Tasks

- [x] **Streaming ergonomics**
    - Async iterator / `PgnStream` for large files
    - Reuse [`GameAssembler`](../src/pgn/game-assembler.ts), [`readLines`](../src/io/line-reader.ts), [`readPgnChunks`](../src/io/pgn-chunks.ts)

- [x] _(moved to Sprint 11)_ **Export `parsePGN`**
    - ~~Modes: `tokenize` | `parse`~~ → single **`parsePGN`** with `headers` option (PGN parse stage)

- [x] _(moved to Sprint 11)_ **Public `ParsedGame` type**
    - Headers + mainline SAN + optional result

- [x] _(moved to Sprint 11)_ **Refactor `analyzePGN`**
    - Compose PGN parse + replay + trackers

- [x] _(moved to Sprint 11)_ **Surface header policy**
    - `headers` / `parseHeaders` option (replaces internal `readInHeader`)

## Done when

- Users can count moves or read headers without board replay via public API.
- Integration tests cover `parsePGN` on fixture PGNs.

## Verification

```bash
npm test
npm run typecheck
npm run lint
```

## Explicitly not doing

- Validate mode, RAV/FEN/variants, comment preservation (see IDEAS.md)
