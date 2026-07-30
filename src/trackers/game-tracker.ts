import { GameTrackerBase } from '#trackers/base-tracker';
import type { ParsedGame } from '#types/parse-pgn';
import type { Tracker } from '#types/tracker';

function isGameTracker(tracker: Tracker): tracker is GameTracker {
    return 'results' in tracker && 'ECO' in tracker;
}

class GameTracker extends GameTrackerBase {
    static override trackerId = 'GameTracker';
    static override workerModule = import.meta.url;

    results: { white: number; black: number; draw: number };
    games: number;
    ECO: { [eco: string]: number };

    constructor() {
        super();
        this.results = { white: 0, black: 0, draw: 0 };
        this.games = 0;
        this.ECO = {};
    }

    override merge(tracker: Tracker) {
        if (!isGameTracker(tracker)) return;

        this.results.white += tracker.results.white;
        this.results.black += tracker.results.black;
        this.results.draw += tracker.results.draw;
        this.games += tracker.games;
        this.time += tracker.time;

        for (const key of Object.keys(tracker.ECO)) {
            const ecoCount = tracker.ECO[key];
            if (ecoCount === undefined) continue;
            if (this.ECO[key] !== undefined) {
                this.ECO[key] += ecoCount;
            } else {
                this.ECO[key] = ecoCount;
            }
        }
    }

    resetWorkerBatch() {
        this.results.white = 0;
        this.results.black = 0;
        this.results.draw = 0;
        this.games = 0;
        this.time = 0;
        this.ECO = {};
    }

    override trackGame(game: ParsedGame) {
        this.games += 1;
        switch (game.result) {
            case '1-0':
                this.results.white += 1;
                break;

            case '1/2-1/2':
                this.results.draw += 1;
                break;

            case '0-1':
                this.results.black += 1;
                break;

            default:
                break;
        }
        const eco = game.headers?.ECO;
        if (eco !== undefined) {
            if (this.ECO[eco] !== undefined) {
                this.ECO[eco] += 1;
            } else {
                this.ECO[eco] = 1;
            }
        }
    }

    finish() {
        this.ECO = Object.keys(this.ECO)
            .toSorted()
            .reduce<Record<string, number>>((a, c) => {
                a[c] = this.ECO[c] ?? 0;
                return a;
            }, {});
    }
}

export { GameTracker };
