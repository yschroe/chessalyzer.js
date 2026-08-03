import { describe, it, expect } from 'bun:test';

import { analyzePGN } from 'chessalyzer';

import CustomGameTracker from '~/test/fixtures/custom-game-tracker';
import { fixtureExpected, fixturePath } from '~/test/helpers/fixtures';

describe('Custom tracker', () => {
    it('merges custom game tracker in worker-parse mode', async () => {
        const tracker = CustomGameTracker();
        const expected = fixtureExpected('results-mix');
        const data = await analyzePGN(fixturePath('results-mix'), {
            trackers: [tracker],
        });

        expect(data.gameCount).toBe(expected.games);
        expect(tracker.state.games).toBe(expected.games);
        expect(tracker.state.wins[0] + tracker.state.wins[1] + tracker.state.wins[2]).toBe(
            expected.games,
        );
    });

    it('merges custom game tracker with filter (single-threaded)', async () => {
        const tracker = CustomGameTracker();
        const data = await analyzePGN(fixturePath('results-mix'), {
            workers: false,
            trackers: [tracker],
            filter: (game) => game.result === '1-0',
        });

        expect(data.gameCount).toBe(3);
        expect(tracker.state.games).toBe(3);
        expect(tracker.state.wins[0]).toBe(3);
        expect(tracker.state.wins[1]).toBe(0);
        expect(tracker.state.wins[2]).toBe(0);
    });
});
