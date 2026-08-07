/**
 * Generates the real outputs shown in the documentation.
 *
 * Every "you get back" code block in docs/content/docs is pasted from this
 * script's output. Run it when the API or the sample file changes:
 *
 *     bun docs/examples/generate-outputs.ts
 *
 * Not wired to any npm script (like bench/exploratory). Imports the library
 * from source so it always reflects the current code.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { analyzePGN, isReplayError } from '../../src/index';
import { parsePGN, streamParsePGN } from '../../src/pgn/index';
import {
    defineMoveTracker,
    gameTracker,
    generateComparisonHeatmap,
    generateHeatmap,
    pieceTracker,
    tileAt,
    tileTracker,
    TileHeatmapPresets,
} from '../../src/trackers/index';

const PGN = fileURLToPath(new URL('./games.pgn', import.meta.url));
const TMP_BAD_PGN = fileURLToPath(new URL('./.games-bad.tmp.pgn', import.meta.url));

function print(label: string, value: unknown): void {
    console.log(`\n=== ${label} ===`);
    console.log(value);
}

function json(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

// --- analyzePGN: result object (quickstart, installation) ---

const tiles = tileTracker();
const analyzeResult = await analyzePGN(PGN, { trackers: [tiles] });
print('ANALYZE_RESULT', json(analyzeResult));

// --- tileTracker state excerpts (quickstart, built-in trackers) ---

const TILE_SQUARES = ['e4', 'e5', 'f7', 'd7', 'h4'] as const;
const tileExcerpt: Record<string, unknown> = { movesTotal: tiles.state.movesTotal };
for (const square of TILE_SQUARES) {
    tileExcerpt[square] = tileAt(tiles.state.tiles, square);
}
print('TILE_STATE_EXCERPT', json(tileExcerpt));

// --- gameTracker state (built-in trackers) ---

const games = gameTracker();
await analyzePGN(PGN, { trackers: [games] });
print('GAME_STATE', json(games.state));

// --- pieceTracker state (built-in trackers) ---

const pieces = pieceTracker();
await analyzePGN(PGN, { trackers: [pieces] });
print('PIECE_STATE', json(pieces.state));

// --- parsePGN / streamParsePGN (parsing PGN files) ---

const parsed = await parsePGN(PGN, { headers: true });
print('PARSED_GAMES', json(parsed));

const parsedNoHeaders = await parsePGN(PGN, { maxGames: 1 });
print('PARSED_GAME_NO_HEADERS', json(parsedNoHeaders));

for await (const game of streamParsePGN(PGN, { headers: true })) {
    print('STREAMED_GAME', json(game));
    break;
}

// --- heatmaps (heatmaps, quickstart) ---

const heat = generateHeatmap(tiles.state, TileHeatmapPresets.TILE_OCC_ALL);
print('HEATMAP_MIN_MAX', json({ min: heat.min, max: heat.max }));

const rows = heat.map.map((row, i) => {
    const rank = 8 - i;
    const cells = row.map((v) => (Math.round(v * 100) / 100).toFixed(2).padStart(6)).join(' ');
    return `${rank}  ${cells}`;
});
print(
    'HEATMAP_VALUES_GRID',
    `\n    ${['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((f) => f.padStart(6)).join(' ')}\n${rows.join('\n')}`,
);

// --- filter (filters) ---

const filtered = tileTracker();
const filterResult = await analyzePGN(PGN, {
    trackers: [filtered],
    filter: (game) => Number(game.headers?.WhiteElo) > 2000,
});
print('FILTER_RESULT', json(filterResult));

// --- comparing analyses (runs + comparison heatmap) ---

const high = tileTracker();
const low = tileTracker();
await analyzePGN(PGN, {
    headers: true,
    runs: [
        { trackers: [high], filter: (game) => Number(game.headers?.WhiteElo) > 2000 },
        { trackers: [low], filter: (game) => Number(game.headers?.WhiteElo) < 1700 },
    ],
});

const comparison = generateComparisonHeatmap(high.state, low.state, ({ data, square }) => {
    const cell = tileAt(data.tiles, square);
    if (!cell) return 0;
    return (cell.w.total.occupiedFor * 100) / data.movesTotal;
});
print('COMPARISON_MIN_MAX', json({ min: comparison.min, max: comparison.max }));

const compRows = comparison.map.map((row, i) => {
    const rank = 8 - i;
    const cells = row.map((v) => (Math.round(v * 100) / 100).toFixed(2).padStart(7)).join(' ');
    return `${rank}  ${cells}`;
});
print(
    'COMPARISON_VALUES_GRID',
    `\n    ${['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((f) => f.padStart(7)).join(' ')}\n${compRows.join('\n')}`,
);

// --- custom move tracker numbers (custom trackers walkthrough) ---

const counter = defineMoveTracker({
    id: 'half-move-counter',
    init: () => ({ halfMoves: 0, captures: 0 }),
    track: (state, actions) => {
        state.halfMoves += 1;
        for (const action of actions) {
            if (action.type === 'capture') {
                state.captures += 1;
            }
        }
    },
    merge: (state, other) => {
        state.halfMoves += other.halfMoves;
        state.captures += other.captures;
    },
})();
await analyzePGN(PGN, { trackers: [counter], workers: false });
print('HALF_MOVE_COUNTER_STATE', json(counter.state));

// --- error handling (skip-game on a file with a broken 4th game) ---

const badGame = `
[Event "Broken game"]
[White "blunderbuss"]
[Black "cleopatra"]
[Result "*"]

1. e4 e5 2. Nf9 0-1
`;
writeFileSync(TMP_BAD_PGN, `${readFileSync(PGN, 'utf8')}\n${badGame}`);
try {
    // a move tracker is attached so the broken game is actually replayed
    const errorResult = await analyzePGN(TMP_BAD_PGN, {
        trackers: [tileTracker()],
        onError: 'skip-game',
    });
    print('ERROR_RESULT', json(errorResult));

    try {
        await analyzePGN(TMP_BAD_PGN, { trackers: [tileTracker()], workers: false });
    } catch (err) {
        print('ABORT_THROWN', json(err, Object.getOwnPropertyNames(err as object)));
        print('ABORT_IS_REPLAY_ERROR', String(isReplayError(err)));
    }
} finally {
    rmSync(TMP_BAD_PGN, { force: true });
}
