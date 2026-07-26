import BaseTracker from '#tracker/base-tracker';
import type { Action } from '#types/actions';
import type { Game } from '#types/game';
import type { Tracker } from '#types/tracker';

function isGameTracker(tracker: Tracker): tracker is GameTrackerBase {
    return 'results' in tracker && 'ECO' in tracker;
}

class GameTrackerBase extends BaseTracker {
    results: { white: number; black: number; draw: number };
    cntGames: number;
    ECO: { [eco: string]: number };

    constructor() {
        super('game');
        this.results = { white: 0, black: 0, draw: 0 };
        this.cntGames = 0;
        this.ECO = {};
    }

    override add(tracker: Tracker) {
        if (!isGameTracker(tracker)) return;

        this.results.white += tracker.results.white;
        this.results.black += tracker.results.black;
        this.results.draw += tracker.results.draw;
        this.cntGames += tracker.cntGames;
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
        this.cntGames = 0;
        this.time = 0;
        this.ECO = {};
    }

    override track(game: Game | Action[]) {
        if (Array.isArray(game)) return;
        this.cntGames += 1;
        switch (game.Result) {
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
        const eco = game.ECO;
        if (eco !== undefined) {
            if (this.ECO[eco] !== undefined) {
                this.ECO[eco] += 1;
            } else {
                this.ECO[eco] = 1;
            }
        }
    }

    finish() {
        // sort keys
        this.ECO = Object.keys(this.ECO)
            .sort()
            .reduce<Record<string, number>>((a, c) => {
                a[c] = this.ECO[c] ?? 0;
                return a;
            }, {});
    }
}

export default GameTrackerBase;
