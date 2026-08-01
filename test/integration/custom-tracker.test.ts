import { describe, it, expect } from 'bun:test';

import { analyzePGN, getTrackerState } from 'chessalyzer';

import CustomGameTracker from '../fixtures/custom-game-tracker';
import { fixtureExpected, fixturePath } from '../helpers/fixtures';

describe('Custom tracker', () => {
    it('merges custom game tracker in worker-parse mode', async () => {
        const tracker = new CustomGameTracker();
        const expected = fixtureExpected('results-mix');
        const data = await analyzePGN(fixturePath('results-mix'), {
            trackers: [tracker],
        });

        const state = getTrackerState(data, tracker);
        expect(data.gameCount).toBe(expected.games);
        expect(state.games).toBe(expected.games);
        expect(state.wins[0] + state.wins[1] + state.wins[2]).toBe(expected.games);
    });

    it('merges custom game tracker with filter (single-threaded)', async () => {
        const tracker = new CustomGameTracker();
        const data = await analyzePGN(fixturePath('results-mix'), {
            workers: false,
            trackers: [tracker],
            filter: (game) => game.result === '1-0',
        });

        const state = getTrackerState(data, tracker);
        expect(data.gameCount).toBe(3);
        expect(state.games).toBe(3);
        expect(state.wins[0]).toBe(3);
        expect(state.wins[1]).toBe(0);
        expect(state.wins[2]).toBe(0);
    });
});
