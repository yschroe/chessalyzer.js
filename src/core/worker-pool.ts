// based on: https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool
import { AsyncResource } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { Worker } from 'node:worker_threads';

import type { WorkerInitData, WorkerMessage, WorkerTaskData } from '#types/worker';

const kTaskInfo = Symbol('kTaskInfo');
const kWorkerFreedEvent = Symbol('kWorkerFreedEvent');

class WorkerPoolTaskInfo extends AsyncResource {
    callback: (err: Error, result: WorkerMessage) => void;

    constructor(callback: (err: Error, result: WorkerMessage) => void) {
        super('WorkerPoolTaskInfo');
        this.callback = callback;
    }

    done(err: Error, result: WorkerMessage) {
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
    workers: Worker[];
    freeWorkers: Worker[];
    tasks: {
        task: WorkerTaskData;
        callback: (err: Error, result: WorkerMessage) => void;
    }[];

    /**
     * Creates a new `WorkerPool`.
     * @param numThreads Count of workers that will be created for the pool.
     * @param filePath Path of the code each worker shall execute.
     * @param workerInitData One-time init payload (e.g. tracker config), passed via workerData.
     */
    constructor(numThreads: number, filePath: string, workerInitData?: WorkerInitData) {
        super();
        this.numThreads = numThreads;
        this.workers = [];
        this.freeWorkers = [];
        this.tasks = [];

        this.flagNotifyWhenDone = false;

        for (let i = 0; i < numThreads; i++) this.addNewWorker(filePath, workerInitData);

        // Any time the kWorkerFreedEvent is emitted, dispatch
        // the next task pending in the queue, if any.
        this.on(kWorkerFreedEvent, () => {
            if (this.tasks.length > 0) {
                const { task, callback } = this.tasks.shift();
                this.runTask(task, callback);
            }
        });
    }

    /**
     * Adds a new Worker to the Workerpool and attaches the event listeners.
     * @param filePath Path to the file the Worker shall execute.
     */
    addNewWorker(filePath: string, workerInitData?: WorkerInitData) {
        const worker: Worker & { [kTaskInfo]?: WorkerPoolTaskInfo } = new Worker(filePath, {
            workerData: workerInitData,
        });

        worker.on('message', (result: WorkerMessage) => {
            // Workers report batch failures via result.error instead of throwing.
            const err = result.error ? new Error(result.error) : null;
            worker[kTaskInfo]?.done(err, result);
            worker[kTaskInfo] = null;

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
                worker[kTaskInfo] = null;
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
     * @param task Data the worker shall process.
     * @param callback The callback function which is called when the task is done or on error.
     */
    runTask(task: WorkerTaskData, callback: (err: Error, result: WorkerMessage) => void) {
        // No free threads, wait until a worker thread becomes free.
        if (this.freeWorkers.length === 0) {
            this.tasks.push({ task, callback });
            return;
        }

        const worker = this.freeWorkers.pop()!;
        worker[kTaskInfo] = new WorkerPoolTaskInfo(callback);
        worker.postMessage(task, [task.pgnChunkBytes.buffer as ArrayBuffer]);
    }

    /**
     * Closes the `WorkerPool` by terminating all workers.
     * Required so worker threads don't keep the Node/Bun process alive after errors.
     */
    async close() {
        for (const worker of this.workers) await worker.terminate();
    }
}
