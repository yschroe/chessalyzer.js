import { describe, expect, it } from 'bun:test';

import { analyzePGN, buildAnalyzeResult } from '#core/analyze';
import { MAX_COLLECTED_ERRORS } from '#core/analyze-errors';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { AnalyzeRun } from '#types/analysis';
import type { ReplayError } from '#types/errors';

import { fixturePath } from '../../../test/helpers/fixtures';

function replayTestError(i: number): ReplayError {
    return { code: 'replay', gameIndex: i, reason: 'IllegalMove', message: 'bad' };
}

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

    it('sets errorsTruncated when more than MAX_COLLECTED_ERRORS are collected', () => {
        const errors = Array.from({ length: MAX_COLLECTED_ERRORS + 3 }, (_, i) =>
            replayTestError(i),
        );
        const runs: AnalyzeRun[] = [{ trackers: [] }];
        const result = buildAnalyzeResult(runs, [{ games: 0, moves: 0, errors }], 1);

        expect(result.errors).toHaveLength(MAX_COLLECTED_ERRORS);
        expect(result.errorsTruncated).toBe(true);
    });

    it('omits errorsTruncated when errors fit within the cap', () => {
        const runs: AnalyzeRun[] = [{ trackers: [] }];
        const err: ReplayError = {
            code: 'replay',
            gameIndex: 0,
            reason: 'IllegalMove',
            message: 'bad',
        };
        const result = buildAnalyzeResult(runs, [{ games: 0, moves: 0, errors: [err] }], 1);

        expect(result.errors).toHaveLength(1);
        expect(result.errorsTruncated).toBeUndefined();
    });
});
