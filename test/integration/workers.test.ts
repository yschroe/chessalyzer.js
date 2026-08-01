import { describe, it, expect, afterEach } from 'bun:test';
import { join } from 'node:path';

import { analyzePGN, getTrackerState } from 'chessalyzer';
import { PieceTracker, TileTracker } from 'chessalyzer/trackers';

import WorkerPool from '#core/worker-pool';
import type { WorkerMessage } from '#types/worker';
import { fixturePath } from '~/test/helpers/fixtures';

const workerPath = join(import.meta.dirname, '../../lib/chess-worker.js');
const badSanPath = join(import.meta.dirname, '../fixtures/bad-san-mid-file.pgn');
const corruptPath = fixturePath('corrupt');

const minimalChunkBytes = new TextEncoder().encode('[Event "t"]\n\n1. e4 1-0\n');

function runTaskWithTimeout(
    pool: WorkerPool,
    task: Parameters<WorkerPool['runTask']>[0],
    timeoutMs: number,
): Promise<{ err: Error | null; result: WorkerMessage | null }> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error('WorkerPool callback timed out')),
            timeoutMs,
        );

        pool.runTask(task, (err, result) => {
            clearTimeout(timer);
            resolve({ err, result });
        });
    });
}

describe('Workers', () => {
    describe('WorkerPool error propagation', () => {
        let pool: WorkerPool | undefined;

        afterEach(async () => {
            await pool?.close();
            pool = undefined;
        });

        it('returns batch errors to the callback instead of hanging', async () => {
            pool = new WorkerPool(1, workerPath, {
                configs: [
                    {
                        trackerData: [{ id: 'DoesNotExist' }],
                        replayMode: 'skip',
                    },
                ],
            });

            const { err, result } = await runTaskWithTimeout(
                pool,
                {
                    pgnChunkBytes: minimalChunkBytes,
                    configs: [{ idxConfig: 0, parseHeaders: false }],
                },
                10_000,
            );

            expect(err).toBeInstanceOf(Error);
            expect(err?.message).toContain('Unknown tracker');
            expect(result === null || result?.error !== undefined || err !== null).toBe(true);
        });
    });

    describe('analyzePGN multithreaded', () => {
        it('aborts on first bad game by default', async () => {
            let caught: unknown;
            try {
                await analyzePGN(badSanPath, { trackers: [new PieceTracker()] });
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeDefined();
            expect(caught).toBeInstanceOf(Error);
        });

        it('processes corrupt.pgn with an incomplete trailing game without hanging', async () => {
            const tileTracker = new TileTracker();
            const data = await Promise.race([
                analyzePGN(corruptPath, { trackers: [tileTracker] }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('analyzePGN timed out')), 10_000),
                ),
            ]);

            expect(data.gameCount).toBe(1);
            expect(data.moveCount).toBe(15);
            const state = getTrackerState(data, tileTracker);
            expect(state.movesTotal).toBeGreaterThan(0);
        });
    });
});
