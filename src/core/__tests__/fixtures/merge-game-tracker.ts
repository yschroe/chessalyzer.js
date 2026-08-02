/**
 * Source-only game tracker for unit merge tests.
 *
 * Unlike `test/fixtures/custom-game-tracker.ts` (package imports + workerModule,
 * models the public MT contract), this stub stays on `#` so `bun test src` needs
 * no build. Merge logic under test does not require workerModule.
 */
import { defineGameTracker } from '#trackers/define-tracker';
import type { ParsedGame } from '#types/parse-pgn';

export interface MergeGameTrackerState {
    wins: [number, number, number];
    games: number;
}

export default defineGameTracker<MergeGameTrackerState>({
    id: 'MergeGameTracker',

    init: () => ({ wins: [0, 0, 0], games: 0 }),

    track(state, game: ParsedGame) {
        state.games += 1;
        switch (game.result) {
            case '1-0':
                state.wins[0] += 1;
                break;
            case '1/2-1/2':
                state.wins[1] += 1;
                break;
            case '0-1':
                state.wins[2] += 1;
                break;
            default:
                break;
        }
    },

    merge(state, other) {
        state.wins[0] += other.wins[0];
        state.wins[1] += other.wins[1];
        state.wins[2] += other.wins[2];
        state.games += other.games;
    },
});
