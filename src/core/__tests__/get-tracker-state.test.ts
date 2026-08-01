import { describe, expect, it } from 'bun:test';

import { buildAnalyzeResult } from '#core/analyze';
import { getTrackerState } from '#core/get-tracker-state';
import { defineGameTracker } from '#trackers/define-tracker';

function makeTracker(id: string) {
    return defineGameTracker({
        id,
        init: () => ({ games: 0 }),
        track: (state) => {
            state.games += 1;
        },
        merge: (state, other) => {
            state.games += other.games;
        },
    });
}

describe('getTrackerState', () => {
    it('resolves a tracker from a single-run result', () => {
        const tracker = makeTracker('single');
        const result = buildAnalyzeResult(
            [{ games: 1, moves: 0 }],
            [[{ tracker, state: { games: 3 } }]],
            1,
            false,
        );

        expect(getTrackerState(result, tracker)).toEqual({ games: 3 });
    });

    it('resolves a unique tracker across multi-run results without runIndex', () => {
        const a = makeTracker('a');
        const b = makeTracker('b');
        const result = buildAnalyzeResult(
            [
                { games: 1, moves: 0 },
                { games: 2, moves: 0 },
            ],
            [[{ tracker: a, state: { games: 1 } }], [{ tracker: b, state: { games: 2 } }]],
            1,
            true,
        );

        expect(getTrackerState(result, a)).toEqual({ games: 1 });
        expect(getTrackerState(result, b)).toEqual({ games: 2 });
    });

    it('throws when the same definition appears in multiple runs without runIndex', () => {
        const shared = makeTracker('shared');
        const result = buildAnalyzeResult(
            [
                { games: 1, moves: 0 },
                { games: 2, moves: 0 },
            ],
            [
                [{ tracker: shared, state: { games: 1 } }],
                [{ tracker: shared, state: { games: 2 } }],
            ],
            1,
            true,
        );

        expect(() => getTrackerState(result, shared)).toThrow(
            'Tracker "shared" appears in multiple runs; pass runIndex to disambiguate',
        );
    });

    it('disambiguates a reused definition with runIndex', () => {
        const shared = makeTracker('shared');
        const result = buildAnalyzeResult(
            [
                { games: 1, moves: 0 },
                { games: 2, moves: 0 },
            ],
            [
                [{ tracker: shared, state: { games: 1 } }],
                [{ tracker: shared, state: { games: 2 } }],
            ],
            1,
            true,
        );

        expect(getTrackerState(result, shared, 0)).toEqual({ games: 1 });
        expect(getTrackerState(result, shared, 1)).toEqual({ games: 2 });
    });

    it('throws when the tracker is missing', () => {
        const present = makeTracker('present');
        const absent = makeTracker('absent');
        const result = buildAnalyzeResult(
            [{ games: 1, moves: 0 }],
            [[{ tracker: present, state: { games: 1 } }]],
            1,
            false,
        );

        expect(() => getTrackerState(result, absent)).toThrow(
            'Tracker "absent" not found in result',
        );
        expect(() => getTrackerState(result, absent, 0)).toThrow(
            'Tracker "absent" not found in run 0',
        );
    });
});
