import { describe, it, expect } from 'bun:test';

import { analyzePGN } from 'chessalyzer';
import {
    gameTracker,
    generateHeatmap,
    pieceTracker,
    TileHeatmapPresets,
    tileTracker,
} from 'chessalyzer/trackers';

import { fixtureExpected, fixturePath, getFixtureEntry } from '~/test/helpers/fixtures';

describe('Trackers on fixtures', () => {
    it('runs GameTracker on lichess-headers', async () => {
        const games = gameTracker();
        const data = await analyzePGN(fixturePath('lichess-headers'), {
            trackers: [games],
        });
        expect(data.gameCount).toBe(1);
        expect(games.state.gameCount).toBe(1);
    });

    it('runs PieceTracker on promotion', async () => {
        const data = await analyzePGN(fixturePath('promotion'), {
            trackers: [pieceTracker()],
        });
        expect(data.gameCount).toBe(1);
        expect(data.moveCount).toBeGreaterThan(0);
    });
});

describe('TileTracker golden (en-passant)', () => {
    const golden = getFixtureEntry('en-passant').golden?.tileTracker;
    if (!golden) throw new Error('en-passant fixture missing TileTracker golden values');

    for (const [mode, workers] of [
        ['single-threaded', false],
        ['multithreaded', undefined],
    ] as const) {
        it(`matches golden values (${mode})`, async () => {
            const tiles = tileTracker();
            const data = await analyzePGN(fixturePath('en-passant'), {
                trackers: [tiles],
                ...(workers === false ? { workers: false } : {}),
            });

            expect(data.gameCount).toBe(1);
            expect(tiles.state.movesTotal).toBe(golden.movesTotal);
            const heat = generateHeatmap(tiles.state, TileHeatmapPresets.TILE_OCC_ALL);
            expect(heat.map[4]?.[4]).toBe(golden.e4TileOccAll);
        });
    }

    it('counts castling as one move (rook leg excluded from move counter)', async () => {
        const tiles = tileTracker();
        await analyzePGN(fixturePath('en-passant'), {
            trackers: [tiles],
            workers: false,
        });

        expect(tiles.state.movesTotal).toBe(golden.movesTotal);
        expect(tiles.state.movesTotal).toBe(fixtureExpected('en-passant').moves);
    });
});
