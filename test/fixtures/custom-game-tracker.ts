import type { ParsedGame } from 'chessalyzer.js/pgn';
import { BaseGameTracker } from 'chessalyzer.js/trackers';

function isCustomGameTracker(tracker: unknown): tracker is CustomGameTracker {
    return (
        typeof tracker === 'object' &&
        tracker !== null &&
        'wins' in tracker &&
        Array.isArray(tracker.wins)
    );
}

export default class CustomGameTracker extends BaseGameTracker {
    static override trackerId = 'CustomGameTracker';
    static override workerModule = import.meta.url;

    wins: [number, number, number] = [0, 0, 0];
    games = 0;

    override merge(tracker: unknown) {
        if (!isCustomGameTracker(tracker)) return;
        this.wins[0] += tracker.wins[0];
        this.wins[1] += tracker.wins[1];
        this.wins[2] += tracker.wins[2];
        this.games += tracker.games;
    }

    override trackGame(game: ParsedGame) {
        this.games += 1;
        switch (game.result) {
            case '1-0':
                this.wins[0] += 1;
                break;

            case '1/2-1/2':
                this.wins[1] += 1;
                break;

            case '0-1':
                this.wins[2] += 1;
                break;

            default:
                break;
        }
    }
}
