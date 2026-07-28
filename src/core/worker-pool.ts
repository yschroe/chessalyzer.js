// based on: https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool
import { AsyncResource } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { Worker } from 'node:worker_threads';

import type { WorkerBatchTask, WorkerInitData, WorkerMessage, WorkerTaskData } from '#types/worker';

const kTaskInfo = Symbol('kTaskInfo');
const kWorkerFreedEvent = Symbol('kWorkerFreedEvent');

type WorkerCallback = (err: Error | null, result: WorkerMessage | null) => void;

type WorkerWithTaskInfo = Worker & { [kTaskInfo]?: WorkerPoolTaskInfo };

class WorkerPoolTaskInfo extends AsyncResource {
    callback: WorkerCallback;

    constructor(callback: WorkerCallback) {
        super('WorkerPoolTaskInfo');
        this.callback = callback;
    }

    done(err: Error | null, result: WorkerMessage | null) {
        this.runInAsyncScope(this.callback, null, err, result);
        this.emitDestroy(); // `TaskInfo`s are used only once.
    }
}

/**
 * A pool of workers which are running on a separate thread each. Tasks can be
 * sent to the pool to be processed without blocking the main thread.
 */
export default class WorkerPool extends EventEmitter {
    flagNotifyWhenDone: boolean;
    numThreads: number;
    filePath: string;
    workerInitData?: WorkerInitData;
    workers: WorkerWithTaskInfo[];
    freeWorkers: WorkerWithTaskInfo[];
    tasks: {
        task: WorkerBatchTask;
        callback: WorkerCallback;
    }[];

    /**
     * Creates a new `WorkerPool`.
     * Workers are spawned lazily on first {@link runTask}, up to `numThreads`.
     * @param numThreads Maximum worker count for the pool.
     * @param filePath Path of the code each worker shall execute.
     * @param workerInitData One-time init payload (tracker config, onError), passed via workerData.
     */
    constructor(numThreads: number, filePath: string, workerInitData?: WorkerInitData) {
        super();
        this.numThreads = numThreads;
        this.filePath = filePath;
        this.workerInitData = workerInitData;
        this.workers = [];
        this.freeWorkers = [];
        this.tasks = [];

        this.flagNotifyWhenDone = false;

        // Any time the kWorkerFreedEvent is emitted, dispatch
        // the next task pending in the queue, if any.
        this.on(kWorkerFreedEvent, () => {
            if (this.tasks.length > 0) {
                const item = this.tasks.shift();
                if (!item) return;
                const { task, callback } = item;
                this.runTask(task, callback);
            }
        });
    }

    /**
     * Adds a new Worker to the Workerpool and attaches the event listeners.
     * @param filePath Path to the file the Worker shall execute.
     */
    addNewWorker(filePath: string, workerInitData?: WorkerInitData) {
        const worker: WorkerWithTaskInfo = new Worker(filePath, {
            workerData: workerInitData,
        });

        worker.on('message', (result: WorkerMessage) => {
            // Workers report batch failures via result.error instead of throwing.
            const err = result.error ? new Error(result.error) : null;
            worker[kTaskInfo]?.done(err, result);
            delete worker[kTaskInfo];

            this.freeWorkers.push(worker);
            this.emit(kWorkerFreedEvent);

            if (
                this.flagNotifyWhenDone &&
                this.workers.length === this.freeWorkers.length &&
                this.tasks.length === 0
            )
                this.emit('done');
        });

        worker.on('error', (err: Error) => {
            // Uncaught worker exception: notify the task callback, then retire the worker.
            if (worker[kTaskInfo]) {
                worker[kTaskInfo].done(err, null);
                delete worker[kTaskInfo];
            } else {
                this.emit('error', err);
            }

            const freeIdx = this.freeWorkers.indexOf(worker);
            if (freeIdx !== -1) this.freeWorkers.splice(freeIdx, 1);

            const workerIdx = this.workers.indexOf(worker);
            if (workerIdx !== -1) this.workers.splice(workerIdx, 1);

            // Do not spawn a replacement worker — the pool will be closed by the caller.
            this.emit(kWorkerFreedEvent);
        });

        this.workers.push(worker);
        this.freeWorkers.push(worker);
        this.emit(kWorkerFreedEvent);
    }

    /**
     * Adds a new task for the `WorkerPool` to execute. If a free worker is available, it will
     * directly execute the task. Else the task is pushed to the queue waiting for a worker to
     * pick it up.
     * @param task Data the worker shall process (PGN chunk only — tracker config is in workerData).
     * @param callback The callback function which is called when the task is done or on error.
     */
    runTask(task: WorkerBatchTask, callback: WorkerCallback) {
        if (this.freeWorkers.length === 0 && this.workers.length < this.numThreads) {
            this.addNewWorker(this.filePath, this.workerInitData);
        }

        // No free threads, wait until a worker thread becomes free.
        if (this.freeWorkers.length === 0) {
            this.tasks.push({ task, callback });
            return;
        }

        const worker = this.freeWorkers.pop();
        if (!worker) return;

        worker[kTaskInfo] = new WorkerPoolTaskInfo(callback);
        const { buffer, byteOffset, byteLength } = task.pgnChunkBytes;
        // Check if the buffer is already the correct slice, or if we need to create a new one.
        const transferBuffer =
            byteOffset === 0 && byteLength === buffer.byteLength
                ? buffer
                : buffer.slice(byteOffset, byteOffset + byteLength);
        if (transferBuffer instanceof SharedArrayBuffer) {
            throw new Error('PGN chunk buffer must be an ArrayBuffer');
        }
        worker.postMessage(task, [transferBuffer]);
    }

    /**
     * Collect accumulated tracker state from every worker after all batch tasks drain.
     */
    flush(): Promise<WorkerMessage[]> {
        if (this.workers.length === 0) return Promise.resolve([]);

        return Promise.all(
            this.workers.map(
                (worker) =>
                    new Promise<WorkerMessage>((resolve, reject) => {
                        if (worker[kTaskInfo]) {
                            reject(
                                new Error('WorkerPool flush called while a batch task is active'),
                            );
                            return;
                        }

                        worker[kTaskInfo] = new WorkerPoolTaskInfo((err, result) => {
                            if (err) reject(err);
                            else resolve(result!);
                        });

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
    async close() {
        await Promise.all(this.workers.map((worker) => worker.terminate()));
    }
}
