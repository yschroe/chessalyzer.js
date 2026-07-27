import { describe, it, expect, afterEach } from 'bun:test';
import { join } from 'node:path';

import WorkerPool from '#core/worker-pool';

const workerPath = join(import.meta.dirname, '../../../lib/chess-worker.js');

describe('WorkerPool', () => {
    let pool: WorkerPool | undefined;

    afterEach(async () => {
        await pool?.close();
        pool = undefined;
    });

    it('does not spawn workers until the first runTask', () => {
        pool = new WorkerPool(8, workerPath, { configs: [{ trackerData: [] }] });
        expect(pool.workers.length).toBe(0);
    });
});
