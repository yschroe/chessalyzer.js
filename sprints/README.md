# Sprints

## Completed (v4 cleanup)

Sprints **01–07** shipped after the v4 API redesign. See [`archive/`](./archive/) for the original task lists and [CHANGELOG](../CHANGELOG.md) for what landed.

| Sprint | Theme                                                       |
| ------ | ----------------------------------------------------------- |
| 01     | Critical fixes (chunk buffer, debug logs)                   |
| 02     | Error model (`onError`, typed errors)                       |
| 03     | Worker infrastructure (`trackerId`, lazy pool)              |
| 04     | Collapse legacy MT (filter/maxGames on worker-chunk)        |
| 05     | Test coverage matrix                                        |
| 06     | Internal consistency (naming, types, replay skip, castling) |
| 07     | Throughput polish (multi-run parse-once, deferred merge)    |

## Active backlog

Forward-looking sprints grounded in [IDEAS.md](../IDEAS.md). Order is suggested priority; sprints can be reordered where dependencies allow.

| Sprint                                                                     | Theme                                          | Effort | Impact |
| -------------------------------------------------------------------------- | ---------------------------------------------- | ------ | ------ |
| [08 — Tracker & type hygiene](./archive/sprint-08-tracker-type-hygiene.md) | File naming, README fixes, dedup               | Small  | Medium |
| [11 — Pipeline terminology & v4 API](./sprint-11-pipeline-terminology.md)  | I/O → PGN parse → replay → analyze; v4 dev API | Large  | High   |
| [09 — Public parse foundation](./sprint-09-public-parse-foundation.md)     | _(mostly absorbed by 11)_                      | Large  | High   |
| [10 — Board state for validate/FEN](./sprint-10-board-state-fen.md)        | Castling rights, EP, validate prep             | Medium | Medium |

```mermaid
flowchart LR
    s08[Sprint 08 Hygiene]
    s11[Sprint 11 Pipeline v4]
    s09[Sprint 09 Parse gaps]
    s10[Sprint 10 Board state]
    ideas[IDEAS longer term]

    s08 --> s11
    s11 --> s09
    s11 --> s10
    s10 --> ideas
```

**Not in scope here:** hot-path refactors (`SanApplier` / `SanToActions` split, manual iterators, `Array.concat` patterns) — always bench before changing.

## Conventions

Each sprint file includes goal, tasks, primary files, done-when criteria, and verification steps.
