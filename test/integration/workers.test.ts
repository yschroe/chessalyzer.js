import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';

import { analyzePGN, getTrackerState } from 'chessalyzer';
import { PieceTracker, TileTracker } from 'chessalyzer/trackers';

import { fixturePath } from '~/test/helpers/fixtures';

const badSanPath = join(import.meta.dirname, '../fixtures/bad-san-mid-file.pgn');
const corruptPath = fixturePath('corrupt');

describe('analyzePGN multithreaded', () => {
    it('aborts on first bad game by default', async () => {
        let caught: unknown;
        try {
            await analyzePGN(badSanPath, { trackers: [PieceTracker] });
        } catch (err) {
            caught = err;
        }

        expect(caught).toBeDefined();
        expect(caught).toBeInstanceOf(Error);
    });

    it('processes corrupt.pgn with an incomplete trailing game without hanging', async () => {
        const tileTracker = TileTracker;
        const data = await Promise.race([
            analyzePGN(corruptPath, { trackers: [tileTracker] }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('analyzePGN timed out')), 10_000),
            ),
        ]);

        expect(data.gameCount).toBe(1);
        expect(data.moveCount).toBe(15);
        const state = getTrackerState(data, tileTracker);
        expect(state.movesTotal).toBeGreaterThan(0);
    });
});
