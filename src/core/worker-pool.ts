import { Worker } from 'node:worker_threads';

import type { WorkerBatchTask, WorkerInitData, WorkerMessage, WorkerTaskData } from '#types/worker';

interface TaskSettlement {
    resolve: (result: WorkerMessage) => void;
    reject: (err: Error) => void;
}

type PooledWorker = Worker & { currentTask?: TaskSettlement };

/**
 * A pool of workers which are running on a separate thread each.
 *
 * Promise-based: {@link runTask} returns one promise per batch and {@link drain}
 * waits for all outstanding work. The first task or worker failure is recorded as
 * **fatal**: queued tasks reject with it, {@link drain} throws it, and late results
 * are discarded. Workers are spawned lazily on first dispatch, up to `numThreads`.
 */
export default class WorkerPool {
    readonly workers: PooledWorker[] = [];
    private readonly freeWorkers: PooledWorker[] = [];
    private readonly queue: Array<{ task: WorkerBatchTask } & TaskSettlement> = [];
    private fatalError: Error | null = null;
    private drainWaiters: Array<() => void> = [];

    /**
     * @param numThreads Maximum worker count for the pool.
     * @param filePath Path of the code each worker shall execute.
     * @param workerInitData One-time init payload (tracker config, onError), passed via workerData.
     */
    constructor(
        private readonly numThreads: number,
        private readonly filePath: string,
        private readonly workerInitData?: WorkerInitData,
    ) {}

    /**
     * Dispatch a batch task. Resolves with the worker's result message once the batch
     * is processed; rejects when the batch or the worker fails, or when the pool was
     * failed via {@link fail} before the task started.
     */
    runTask(task: WorkerBatchTask): Promise<WorkerMessage> {
        if (this.fatalError) return Promise.reject(this.fatalError);
        const promise = new Promise<WorkerMessage>((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
        });
        this.pump();
        return promise;
    }

    /** True once a fatal error has been recorded via {@link fail} (or a worker failure). */
    get failed(): boolean {
        return this.fatalError !== null;
    }

    /**
     * Record a fatal error: queued tasks reject with it, {@link drain} throws it.
     * Running tasks still settle normally. Idempotent — the first error wins.
     */
    fail(err: Error): void {
        if (this.fatalError) return;
        this.fatalError = err;
        for (const item of this.queue.splice(0)) {
            item.reject(err);
        }
        this.notifyDrainWaiters();
    }

    /** Resolve once all queued and running tasks have settled; throws the first fatal error. */
    async drain(): Promise<void> {
        for (;;) {
            if (this.fatalError) throw this.fatalError;
            if (this.queue.length === 0 && !this.workers.some((w) => w.currentTask)) return;
            // oxlint-disable-next-line eslint/no-await-in-loop -- condition-variable wait, not sequential work
            await new Promise<void>((resolve) => {
                this.drainWaiters.push(resolve);
            });
        }
    }

    /**
     * Collect accumulated tracker state from every worker after all batch tasks drain.
     * Flush tasks bypass the queue — callers must {@link drain} first.
     */
    flush(): Promise<WorkerMessage[]> {
        if (this.workers.length === 0) return Promise.resolve([]);

        return Promise.all(
            this.workers.map(
                (worker) =>
                    new Promise<WorkerMessage>((resolve, reject) => {
                        if (worker.currentTask) {
                            reject(
                                new Error('WorkerPool flush called while a batch task is active'),
                            );
                            return;
                        }

                        worker.currentTask = { resolve, reject };

                        const flushTask: WorkerTaskData = { type: 'flush' };
                        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Node worker_threads MessagePort has no targetOrigin
                        worker.postMessage(flushTask);
                    }),
            ),
        );
    }

    /**
     * Closes the `WorkerPool` by terminating all workers.
     * Required so worker threads don't keep the Node/Bun process alive after errors.
     */
    async close(): Promise<void> {
        await Promise.all(this.workers.map((worker) => worker.terminate()));
    }

    /** Assign queued tasks to free workers, spawning workers lazily up to `numThreads`. */
    private pump(): void {
        while (this.queue.length > 0) {
            if (this.freeWorkers.length === 0) {
                if (this.workers.length >= this.numThreads) return;
                this.addNewWorker();
                continue;
            }

            const worker = this.freeWorkers.pop();
            const item = this.queue.shift();
            if (!worker || !item) return;

            worker.currentTask = { resolve: item.resolve, reject: item.reject };

            const { buffer, byteOffset, byteLength } = item.task.pgnChunkBytes;
            // Check if the buffer is already the correct slice, or if we need to create a new one.
            const transferBuffer =
                byteOffset === 0 && byteLength === buffer.byteLength
                    ? buffer
                    : buffer.slice(byteOffset, byteOffset + byteLength);
            if (transferBuffer instanceof SharedArrayBuffer) {
                throw new Error('PGN chunk buffer must be an ArrayBuffer');
            }
            worker.postMessage(item.task, [transferBuffer]);
        }
    }

    private addNewWorker(): void {
        const worker: PooledWorker = new Worker(this.filePath, {
            workerData: this.workerInitData,
        });

        worker.on('message', (result: WorkerMessage) => {
            const task = worker.currentTask;
            delete worker.currentTask;
            this.freeWorkers.push(worker);

            // Workers report batch failures via result.error instead of throwing.
            if (result.error) {
                const err = new Error(result.error);
                task?.reject(err);
                this.fail(err);
            } else {
                task?.resolve(result);
            }

            this.pump();
            this.notifyDrainWaiters();
        });

        worker.on('error', (err: Error) => {
            // Uncaught worker exception: settle the active task, then retire the worker.
            // Idle-worker errors land here too — both are fatal to the pool.
            const task = worker.currentTask;
            delete worker.currentTask;
            task?.reject(err);

            const freeIdx = this.freeWorkers.indexOf(worker);
            if (freeIdx !== -1) this.freeWorkers.splice(freeIdx, 1);

            const workerIdx = this.workers.indexOf(worker);
            if (workerIdx !== -1) this.workers.splice(workerIdx, 1);

            // Do not spawn a replacement worker — the pool will be closed by the caller.
            this.fail(err);
            this.pump();
            this.notifyDrainWaiters();
        });

        this.workers.push(worker);
        this.freeWorkers.push(worker);
    }

    /** Wake drain waiters once nothing is queued or running (or a fatal error is pending). */
    private notifyDrainWaiters(): void {
        if (this.drainWaiters.length === 0) return;
        if (
            !this.fatalError &&
            (this.queue.length > 0 || this.workers.some((w) => w.currentTask))
        ) {
            return;
        }
        for (const notify of this.drainWaiters.splice(0)) {
            notify();
        }
    }
}
