import { describe, it, expect, afterEach } from 'bun:test';
import { fileURLToPath } from 'node:url';

import { isReplayError } from '#core/analyze-errors';
import WorkerPool from '#core/worker-pool';
import type { WorkerMessage } from '#core/worker-types';

/** Valid stub — only used once a worker is actually spawned. */
const stubWorkerPath = fileURLToPath(new URL('fixtures/stub-worker.ts', import.meta.url));
const stubErrorWorkerPath = fileURLToPath(
    new URL('fixtures/stub-error-worker.ts', import.meta.url),
);
/** Guaranteed missing — used to prove filePath is validated at spawn time. */
const missingWorkerPath = fileURLToPath(
    new URL('fixtures/does-not-exist-worker.ts', import.meta.url),
);

function minimalChunkBytes(): Uint8Array {
    // Fresh buffer per task: WorkerPool transfers the ArrayBuffer, which detaches it.
    return new TextEncoder().encode('[Event "t"]\n\n1. e4 1-0\n');
}

const emptyInit = {
    configs: [{ trackerSpecs: [] as { id: string }[], replayMode: 'skip' as const }],
};

async function runTaskWithTimeout(
    pool: WorkerPool,
    task: Parameters<WorkerPool['runTask']>[0],
    timeoutMs: number,
): Promise<{ err: Error | null; result: WorkerMessage | null }> {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('WorkerPool task timed out')), timeoutMs),
    );
    const settled = pool.runTask(task).then(
        (result) => ({ err: null, result }),
        (err: unknown) => ({
            err: err instanceof Error ? err : new Error(String(err)),
            result: null,
        }),
    );
    return Promise.race([settled, timeout]);
}

describe('WorkerPool', () => {
    let pool: WorkerPool | undefined;

    afterEach(async () => {
        await pool?.close();
        pool = undefined;
    });

    it('does not spawn workers until the first runTask', () => {
        // filePath is unused until pump() → addNewWorker(); a missing path must
        // not affect this assertion (see the following test for spawn failure).
        pool = new WorkerPool(8, missingWorkerPath, emptyInit);
        expect(pool.workers.length).toBe(0);
    });

    it('rejects when the worker file path does not exist', async () => {
        pool = new WorkerPool(1, missingWorkerPath, emptyInit);

        const { err } = await runTaskWithTimeout(
            pool,
            {
                type: 'batch',
                pgnChunkBytes: minimalChunkBytes(),
                configs: [{ idxConfig: 0, parseHeaders: false }],
            },
            10_000,
        );

        expect(err).toBeInstanceOf(Error);
        expect(err?.message.length).toBeGreaterThan(0);
        expect(pool.failed).toBe(true);
    });

    it('resolves runTask for a successful stub worker', async () => {
        pool = new WorkerPool(1, stubWorkerPath, emptyInit);

        const { err, result } = await runTaskWithTimeout(
            pool,
            {
                type: 'batch',
                pgnChunkBytes: minimalChunkBytes(),
                configs: [{ idxConfig: 0, parseHeaders: false }],
            },
            10_000,
        );

        expect(err).toBeNull();
        expect(result?.error).toBeUndefined();
        expect(result?.results).toEqual([{ idxConfig: 0, games: 0, moves: 0 }]);
    });

    it('rejects runTask when the worker posts result.error (does not hang)', async () => {
        pool = new WorkerPool(1, stubErrorWorkerPath, emptyInit);

        const { err, result } = await runTaskWithTimeout(
            pool,
            {
                type: 'batch',
                pgnChunkBytes: minimalChunkBytes(),
                configs: [{ idxConfig: 0, parseHeaders: false }],
            },
            10_000,
        );

        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toContain('Unknown tracker');
        expect(result).toBeNull();
        expect(pool.failed).toBe(true);
    });

    it('rejects runTask with typed ReplayError when worker posts a structured error', async () => {
        const structuredErrorWorkerPath = fileURLToPath(
            new URL('fixtures/stub-structured-error-worker.ts', import.meta.url),
        );
        pool = new WorkerPool(1, structuredErrorWorkerPath, emptyInit);

        const { err } = await runTaskWithTimeout(
            pool,
            {
                type: 'batch',
                pgnChunkBytes: minimalChunkBytes(),
                configs: [{ idxConfig: 0, parseHeaders: false }],
            },
            10_000,
        );

        expect(isReplayError(err)).toBe(true);
        if (isReplayError(err)) {
            expect(err.gameIndex).toBe(3);
            expect(err.san).toBe('Nf9');
            expect(err.reason).toBe('IllegalMove');
        }
        expect(pool.failed).toBe(true);
    });
});
