import { GameTrackerBase } from 'chessalyzer.js/trackers';
import type { Game, Tracker } from 'chessalyzer.js/trackers';

function isCustomGameTracker(tracker: Tracker): tracker is CustomGameTracker {
    return 'wins' in tracker && Array.isArray(tracker.wins);
}

export default class CustomGameTracker extends GameTrackerBase {
    static override trackerId = 'CustomGameTracker';
    static override workerModule = import.meta.url;

    wins = [0, 0, 0];
    games = 0;

    merge(tracker: Tracker) {
        if (!isCustomGameTracker(tracker)) return;
        this.wins[0] += tracker.wins[0];
        this.wins[1] += tracker.wins[1];
        this.wins[2] += tracker.wins[2];
        this.games += tracker.games;
        this.time += tracker.time;
    }

    trackGame(game: Game) {
        this.games += 1;
        switch (game.Result) {
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
