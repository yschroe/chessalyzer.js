import type { ParsedGame } from 'chessalyzer/pgn';
import { BaseGameTracker } from 'chessalyzer/trackers';

export interface CustomGameTrackerState {
    wins: [number, number, number];
    games: number;
}

export default class CustomGameTracker extends BaseGameTracker<CustomGameTrackerState> {
    override readonly id = 'CustomGameTracker';
    override readonly workerModule = import.meta.url;

    init(): CustomGameTrackerState {
        return { wins: [0, 0, 0], games: 0 };
    }

    merge(state: CustomGameTrackerState, other: CustomGameTrackerState): void {
        state.wins[0] += other.wins[0];
        state.wins[1] += other.wins[1];
        state.wins[2] += other.wins[2];
        state.games += other.games;
    }

    track(state: CustomGameTrackerState, game: ParsedGame): void {
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
    }
}
