import { describe, expect, it } from 'bun:test';

import { analyzePGN } from '#core/analyze';
import { TileTracker } from '#trackers/tile/tile-tracker';

import { fixturePath } from '../../../test/helpers/fixtures';

describe('analyzePGN result shape', () => {
    it('returns tracker refs on each run without per-run movesPerSecond', async () => {
        const tileTracker = new TileTracker();
        const result = await analyzePGN(fixturePath('basic-normal'), {
            trackers: [tileTracker],
            workers: false,
        });

        expect(result.runs).toHaveLength(1);
        expect(result.runs[0]?.trackers).toEqual([tileTracker]);
        expect(result.runs[0]?.trackers[0]).toBe(tileTracker);
        expect(result.runs[0]).not.toHaveProperty('movesPerSecond');
        expect(result.movesPerSecond).toBeGreaterThan(0);
        expect(tileTracker.movesTotal).toBe(result.moveCount);
    });

    it('sums games across runs', async () => {
        const t1 = new TileTracker();
        const t2 = new TileTracker();
        const result = await analyzePGN(fixturePath('results-mix'), {
            workers: false,
            runs: [
                { trackers: [t1], maxGames: 2 },
                { trackers: [t2], maxGames: 3 },
            ],
        });

        expect(result.runs[0]?.gameCount).toBe(2);
        expect(result.runs[1]?.gameCount).toBe(3);
        expect(result.gameCount).toBe(5);
        expect(result.runs[0]?.trackers[0]).toBe(t1);
        expect(result.runs[1]?.trackers[0]).toBe(t2);
    });
});
