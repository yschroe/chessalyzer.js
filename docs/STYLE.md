# Documentation style

This guide is for anyone (human or agent) writing or editing Chessalyzer docs under [`docs/content/docs/`](content/docs/). Match the voice and structure of the existing pages — especially [Welcome](content/docs/index.mdx), [Your first analysis](content/docs/quickstart.mdx), and [Filtering games](content/docs/filters.mdx).

The site is Fumadocs on Waku. Content lives as MDX; navigation is [`content/docs/meta.json`](content/docs/meta.json) (and nested `meta.json` files for Trackers / Heatmaps).

## Audience and tone

Docs should feel **friendly, warm, and approachable** — including for readers who are not deeply technical. Prefer teaching over reference dumps.

- **Second person** ("you"), contractions, short sentences.
- Lead with **what the reader wants to do**, not with internals.
- Prefer plain-language headings ("Your first analysis", "Filtering games") over API names when the page is a guide.
- Tables are for true reference material (options, fields, presets). Prefer short prose + one good example over long field inventories.
- Avoid sounding like a changelog, a migration guide, or a PR description.

## Information architecture

Three sections in the sidebar:

| Section             | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| **Getting started** | Install, first win, orientation                                       |
| **Guides**          | Everyday use: trackers, heatmaps, parsing, filters, comparing, errors |
| **Going further**   | Internals, pipeline deep dives, multithreading, performance rationale |

Put pipeline stages, worker merge semantics, and optimization notes in **Going further**. If a technical detail matters on a Guide page (e.g. why a filter forces single-threaded mode), use a **Callout** and link to the deep dive — do not expand the guide into a systems essay.

## Concrete examples and return shapes

Never leave the reader guessing what comes back from a call.

1. Prefer the shared example file [`examples/games.pgn`](examples/games.pgn) (three short games, mixed ELOs). Show it inline on the quickstart; elsewhere link to `/docs/quickstart#the-example-file`.
2. Use `'games.pgn'` in code samples — not `'<pathToPgnFile>'` or abstract placeholders.
3. For every public function you introduce, show **real return shapes**: `AnalyzeResult`, `ParsedGame[]`, tracker `.state`, `HeatmapData`, error entries, etc.
4. Prefer **annotated excerpts** when full JSON is huge (e.g. trim `byPiece` zeros, keep the squares that tell the story). Say when something is trimmed.
5. When an output is machine-sensitive (`durationMs`, `movesPerSecond`), note that the reader's numbers will differ.

### Regenerating outputs

[`examples/generate-outputs.ts`](examples/generate-outputs.ts) runs the library against `games.pgn` and prints the values used in the docs. When the API or the sample file changes:

```bash
bun docs/examples/generate-outputs.ts
```

Paste fresh outputs into the MDX pages. Do not invent plausible JSON by hand.

## Callouts

Fumadocs `<Callout>` is available in MDX. Use it for asides that would break the narrative flow:

| `type` | Use for                                                                              |
| ------ | ------------------------------------------------------------------------------------ |
| `idea` | Tips and follow-ups (e.g. `heatmapToString`, when to stream-parse)                   |
| `info` | Technical asides that matter on this page (e.g. filters → single-threaded)           |
| `warn` | Pitfalls (reading state mid-analysis, recycled `Action` objects, no legality checks) |

Give every callout a short, memorable `title`. Keep the body to a few sentences; link to Going Further for the long version.

```mdx
<Callout type="info" title="Why filters run single-threaded">
    A filter is a JavaScript closure, and closures can't be shipped to worker threads…
</Callout>
```

## What not to write

- **Changelog / migration leftovers** — do not mention removed options, previous APIs, or "no special X field is required anymore." Describe the current API only.
- **Placeholder paths and fake shapes** — do not invent return JSON; regenerate it.
- **Internal jargon in Guides** without a callout or link — `AssembledGame`, worker snapshots, chunk byte targets belong in Going Further (or a titled Callout).
- **Dense option tables as the whole page** — open with a story and a working snippet first.
- **First-person or corporate marketing voice** — no "we are excited to announce," no "leverage," no "robust solution."

## Page shape (checklist)

A good Guide page usually has:

1. One-sentence promise of what the reader will learn.
2. A working code snippet using `games.pgn` (or a clear link to it).
3. The **real** result / state / shape, with a one-line reading of what it means.
4. Callouts for caveats and tips.
5. Cross-links to the next natural page (and to Going Further only when the reader opts in).

A good Going Further page may be denser, use tables and diagrams, and assume Guides are already read.

## Tooling notes

- `docs/examples/` is excluded from the docs TypeScript/`oxlint` configs (it imports the library from source). Keep it that way.
- Small example PGNs under `docs/examples/` are tracked via a `!.gitignore` exception (`*.pgn` is ignored globally).
- After content changes: `cd docs && bun run typecheck && bun run lint && bun run build`.
