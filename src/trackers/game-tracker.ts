import { defineGameTracker } from '#trackers/define-tracker';

export interface GameTrackerState {
    results: { white: number; black: number; draw: number };
    gameCount: number;
    eco: Record<string, number>;
}

function createInitialState(): GameTrackerState {
    return {
        results: { white: 0, black: 0, draw: 0 },
        gameCount: 0,
        eco: {},
    };
}

/** Built-in game-level tracker: result counts, game count, and ECO distribution. */
export const gameTracker = defineGameTracker<GameTrackerState>({
    id: 'GameTracker',

    init: createInitialState,

    track(state, game) {
        state.gameCount += 1;
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
            state.eco[eco] = (state.eco[eco] ?? 0) + 1;
        }
    },

    merge(state, other) {
        state.results.white += other.results.white;
        state.results.black += other.results.black;
        state.results.draw += other.results.draw;
        state.gameCount += other.gameCount;

        for (const key of Object.keys(other.eco)) {
            const ecoCount = other.eco[key];
            if (ecoCount === undefined) continue;
            state.eco[key] = (state.eco[key] ?? 0) + ecoCount;
        }
    },

    onFinish(state) {
        state.eco = Object.keys(state.eco)
            .toSorted()
            .reduce<Record<string, number>>((a, c) => {
                a[c] = state.eco[c] ?? 0;
                return a;
            }, {});
    },
});
