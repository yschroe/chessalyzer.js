import { describe, it, expect, afterEach } from 'bun:test';
import { join } from 'node:path';

import WorkerPool from '#core/worker-pool';

// TODO: Check if path works
const workerPath = join(import.meta.dirname, '~/src/chess-worker.js');

describe('WorkerPool', () => {
    let pool: WorkerPool | undefined;

    afterEach(async () => {
        await pool?.close();
        pool = undefined;
    });

    it('does not spawn workers until the first runTask', () => {
        pool = new WorkerPool(8, workerPath, {
            configs: [{ trackerData: [], replayMode: 'skip' }],
        });
        expect(pool.workers.length).toBe(0);
    });
});
