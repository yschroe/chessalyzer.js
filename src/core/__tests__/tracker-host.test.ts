import { describe, it, expect } from 'bun:test';

import { TrackerHost } from '#core/tracker-host';
import { defineGameTracker, defineMoveTracker } from '#trackers/define-tracker';
import type { ParsedGame } from '#types/parse-pgn';

describe('TrackerHost', () => {
    it('initializes state from instances', () => {
        const factory = defineGameTracker({
            id: 'test-game',
            init: () => ({ count: 0 }),
            track: (state) => {
                state.count += 1;
            },
            merge: (state, other) => {
                state.count += other.count;
            },
        });
        const instance = factory();

        const host = new TrackerHost([instance]);
        host.trackGame({ moves: [], result: '1-0' } satisfies ParsedGame);

        expect(instance.state).toEqual({ count: 1 });
        expect(host.results()[0]).toBe(instance);
    });

    it('merges snapshots by index', () => {
        const factory = defineMoveTracker({
            id: 'test-move',
            init: () => ({ total: 0 }),
            track: (state, actions) => {
                state.total += actions.length;
            },
            merge: (state, other) => {
                state.total += other.total;
            },
        });

        const mainInstance = factory();
        const workerInstance = factory();
        const main = new TrackerHost([mainInstance]);
        const worker = new TrackerHost([workerInstance]);

        workerInstance.state.total = 5;
        main.mergeSnapshots(worker.snapshots());

        expect(mainInstance.state).toEqual({ total: 5 });
        expect(worker.snapshots()[0]?.index).toBe(0);
    });

    it('preserves input order in results()', () => {
        const gameFactory = defineGameTracker({
            id: 'order-game',
            init: () => ({ count: 0 }),
            track: (state) => {
                state.count += 1;
            },
            merge: (state, other) => {
                state.count += other.count;
            },
        });
        const moveFactory = defineMoveTracker({
            id: 'order-move',
            init: () => ({ total: 0 }),
            track: (state, actions) => {
                state.total += actions.length;
            },
            merge: (state, other) => {
                state.total += other.total;
            },
        });

        const move = moveFactory();
        const game = gameFactory();
        const host = new TrackerHost([move, game]);
        expect(host.results().map((entry) => entry.def.id)).toEqual(['order-move', 'order-game']);
    });

    it('calls onFinish hooks on all trackers', () => {
        let finished = false;
        const factory = defineGameTracker({
            id: 'on-finish-test',
            init: () => ({}),
            track: () => {},
            merge: () => {},
            onFinish: () => {
                finished = true;
            },
        });

        const host = new TrackerHost([factory()]);
        host.onFinish();
        expect(finished).toBe(true);
    });

    it('aliases entry.state to instance.state', () => {
        const factory = defineMoveTracker({
            id: 'alias-test',
            init: () => ({ total: 0 }),
            track: () => {},
            merge: () => {},
        });
        const instance = factory();
        const host = new TrackerHost([instance]);
        expect(host.moveEntries[0]?.state).toBe(instance.state);
    });
});
