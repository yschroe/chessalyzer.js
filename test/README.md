# Testing

## Layout

```
src/<module>/__tests__/     Unit tests colocated with the module they cover
test/integration/           End-to-end tests against the built library
test/fixtures/              Small PGN files committed to git
test/corpus/                Large PGN files (gitignored, optional)
test/helpers/               Shared test utilities
```

### Colocated unit tests

Module-specific tests live next to the code they exercise (e.g. `src/pgn/__tests__/pgn-chunk.test.js` tests `line-reader.ts` and `game-assembler.ts`). This makes it obvious which source file a failure relates to.

### Integration tests

Tests that run the full `analyzePGN` pipeline stay in `test/integration/` because they span parsing, workers, and trackers — not a single module.

### Fixtures vs corpus

|          | Fixtures                  | Corpus                     |
| -------- | ------------------------- | -------------------------- |
| Location | `test/fixtures/`          | `test/corpus/`             |
| In git   | yes                       | no                         |
| CI       | always runs               | skipped without local file |
| Purpose  | format/edge-case coverage | golden regression at scale |

## Commands

```sh
bun test                      # fixtures + unit tests (CI default)
bun run test:corpus           # include corpus regression
bun run test:fetch-corpus     # copy large PGNs into test/corpus/
bun run test:build-fixtures   # regenerate manifest after fixture changes
```
