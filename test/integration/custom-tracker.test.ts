import { describe, it, expect } from 'bun:test';

import { analyzePGN } from 'chessalyzer.js';

import CustomGameTracker from '../fixtures/custom-game-tracker';
import { fixtureExpected, fixturePath } from '../helpers/fixtures';

describe('Custom tracker', () => {
    it('merges custom game tracker in worker-parse mode', async () => {
        const tracker = new CustomGameTracker();
        const expected = fixtureExpected('results-mix');
        const data = await analyzePGN(fixturePath('results-mix'), {
            trackers: [tracker],
        });

        expect(data.gameCount).toBe(expected.games);
        expect(tracker.games).toBe(expected.games);
        expect(tracker.wins[0] + tracker.wins[1] + tracker.wins[2]).toBe(expected.games);
    });

    it('merges custom game tracker with filter (single-threaded)', async () => {
        const tracker = new CustomGameTracker();
        const data = await analyzePGN(fixturePath('results-mix'), {
            workers: false,
            trackers: [tracker],
            filter: (game) => game.result === '1-0',
        });

        expect(data.gameCount).toBe(3);
        expect(tracker.games).toBe(3);
        expect(tracker.wins[0]).toBe(3);
        expect(tracker.wins[1]).toBe(0);
        expect(tracker.wins[2]).toBe(0);
    });
});
