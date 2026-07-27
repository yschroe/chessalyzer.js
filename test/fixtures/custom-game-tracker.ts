import { GameTrackerBase } from 'chessalyzer.js';
import type { Game, Tracker } from 'chessalyzer.js';

function isCustomGameTracker(tracker: Tracker): tracker is CustomGameTracker {
    return 'wins' in tracker && Array.isArray(tracker.wins);
}

export default class CustomGameTracker extends GameTrackerBase {
    static override trackerId = 'CustomGameTracker';
    static override workerModule = import.meta.url;

    wins = [0, 0, 0];
    cntGames = 0;

    merge(tracker: Tracker) {
        if (!isCustomGameTracker(tracker)) return;
        this.wins[0] += tracker.wins[0];
        this.wins[1] += tracker.wins[1];
        this.wins[2] += tracker.wins[2];
        this.cntGames += tracker.cntGames;
        this.time += tracker.time;
    }

    trackGame(game: Game) {
        this.cntGames += 1;
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
