import type { ParsedGame } from 'chessalyzer/pgn';
import { defineGameTracker } from 'chessalyzer/trackers';

interface CustomGameTrackerState {
    wins: [number, number, number];
    games: number;
}

export default defineGameTracker<CustomGameTrackerState>({
    id: 'CustomGameTracker',
    workerModule: import.meta.url,

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
