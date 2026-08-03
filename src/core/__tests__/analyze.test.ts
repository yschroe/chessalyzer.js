import { describe, expect, it } from 'bun:test';

import { analyzePGN, buildAnalyzeResult } from '#core/analyze';
import { MAX_COLLECTED_ERRORS } from '#core/analyze-errors';
import { tileTracker } from '#trackers/tile/tile-tracker';
import type { ReplayError } from '#types/errors';
import { fixturePath } from '~/test/helpers/fixtures';

function replayTestError(i: number): ReplayError {
    return { code: 'replay', gameIndex: i, reason: 'IllegalMove', message: 'bad' };
}

describe('analyzePGN result shape', () => {
    it('returns a single-entry runs array on single-run calls', async () => {
        const tiles = tileTracker();
        const result = await analyzePGN(fixturePath('basic-normal'), {
            trackers: [tiles],
            workers: false,
        });

        expect(result.runs).toHaveLength(1);
        expect(result.runs[0]?.trackers[0]).toBe(tiles);
        expect(result.movesPerSecond).toBeGreaterThan(0);
        expect(tiles.state.movesTotal).toBe(result.moveCount);
    });

    it('returns one run entry per run on multi-run calls', async () => {
        const tilesA = tileTracker();
        const tilesB = tileTracker();
        const result = await analyzePGN(fixturePath('results-mix'), {
            workers: false,
            runs: [
                { trackers: [tilesA], maxGames: 2 },
                { trackers: [tilesB], maxGames: 3 },
            ],
        });

        expect(result.runs[0]?.gameCount).toBe(2);
        expect(result.runs[1]?.gameCount).toBe(3);
        expect(result.gameCount).toBe(5);
        expect(result.runs[0]?.trackers[0]).toBe(tilesA);
        expect(result.runs[1]?.trackers[0]).toBe(tilesB);
    });

    it('sets errorsTruncated when more than MAX_COLLECTED_ERRORS are collected', () => {
        const errors = Array.from({ length: MAX_COLLECTED_ERRORS + 3 }, (_, i) =>
            replayTestError(i),
        );
        const result = buildAnalyzeResult([{ games: 0, moves: 0, errors }], [[]], 1);

        expect(result.errors).toHaveLength(MAX_COLLECTED_ERRORS);
        expect(result.errorsTruncated).toBe(true);
    });

    it('omits errorsTruncated when errors fit within the cap', () => {
        const err: ReplayError = {
            code: 'replay',
            gameIndex: 0,
            reason: 'IllegalMove',
            message: 'bad',
        };
        const result = buildAnalyzeResult([{ games: 0, moves: 0, errors: [err] }], [[]], 1);

        expect(result.errors).toHaveLength(1);
        expect(result.errorsTruncated).toBeUndefined();
    });

    it('rejects concurrent reuse of an in-flight instance', async () => {
        const { normalizeAnalyzeOptions } = await import('#core/analysis-config');
        const tiles = tileTracker();
        const pending = analyzePGN(fixturePath('results-mix'), {
            trackers: [tiles],
            workers: false,
        });
        expect(() => normalizeAnalyzeOptions({ trackers: [tiles], workers: false })).toThrow(
            'already in use',
        );
        await pending;
    });
});
