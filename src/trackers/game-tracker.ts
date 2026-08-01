import { BaseGameTracker } from '#trackers/define-tracker';
import type { ParsedGame } from '#types/parse-pgn';

export interface GameTrackerState {
    results: { white: number; black: number; draw: number };
    games: number;
    ECO: Record<string, number>;
}

class GameTracker extends BaseGameTracker<GameTrackerState> {
    override readonly id = 'GameTracker';
    override readonly workerModule = import.meta.url;

    init(): GameTrackerState {
        return {
            results: { white: 0, black: 0, draw: 0 },
            games: 0,
            ECO: {},
        };
    }

    merge(state: GameTrackerState, other: GameTrackerState): void {
        state.results.white += other.results.white;
        state.results.black += other.results.black;
        state.results.draw += other.results.draw;
        state.games += other.games;

        for (const key of Object.keys(other.ECO)) {
            const ecoCount = other.ECO[key];
            if (ecoCount === undefined) continue;
            state.ECO[key] = (state.ECO[key] ?? 0) + ecoCount;
        }
    }

    track(state: GameTrackerState, game: ParsedGame): void {
        state.games += 1;
        switch (game.result) {
            case '1-0':
                state.results.white += 1;
                break;

            case '1/2-1/2':
                state.results.draw += 1;
                break;

            case '0-1':
                state.results.black += 1;
                break;

            default:
                break;
        }
        const eco = game.headers?.ECO;
        if (eco !== undefined) {
            state.ECO[eco] = (state.ECO[eco] ?? 0) + 1;
        }
    }

    override onFinish(state: GameTrackerState): void {
        state.ECO = Object.keys(state.ECO)
            .toSorted()
            .reduce<Record<string, number>>((a, c) => {
                a[c] = state.ECO[c] ?? 0;
                return a;
            }, {});
    }
}

export { GameTracker };
