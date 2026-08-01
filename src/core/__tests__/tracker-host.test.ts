import { describe, it, expect } from 'bun:test';

import { TrackerHost } from '#core/tracker-host';
import { defineGameTracker, defineMoveTracker } from '#trackers/define-tracker';
import type { ParsedGame } from '#types/parse-pgn';

describe('TrackerHost', () => {
    it('initializes state from definitions', () => {
        const gameTracker = defineGameTracker({
            id: 'test-game',
            init: () => ({ count: 0 }),
            track: (state) => {
                state.count += 1;
            },
            merge: (state, other) => {
                state.count += other.count;
            },
        });

        const host = new TrackerHost([gameTracker]);
        host.trackGame({ moves: [], result: '1-0' } as ParsedGame);

        expect(host.results()[0]?.state).toEqual({ count: 1 });
    });

    it('merges snapshots by id', () => {
        const moveTracker = defineMoveTracker({
            id: 'test-move',
            init: () => ({ total: 0 }),
            track: (state, actions) => {
                state.total += actions.length;
            },
            merge: (state, other) => {
                state.total += other.total;
            },
        });

        const main = new TrackerHost([moveTracker]);
        const worker = new TrackerHost([moveTracker]);
        const workerState = worker.moveEntries[0]!.state as { total: number };
        workerState.total = 5;

        main.mergeSnapshots(worker.snapshots());

        expect((main.moveEntries[0]!.state as { total: number }).total).toBe(5);
    });

    it('calls finish hooks on all trackers', () => {
        let finished = false;
        const tracker = defineGameTracker({
            id: 'finish-test',
            init: () => ({}),
            track: () => {},
            merge: () => {},
            finish: () => {
                finished = true;
            },
        });

        const host = new TrackerHost([tracker]);
        host.finish();
        expect(finished).toBe(true);
    });
});
