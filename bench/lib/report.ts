import { formatNumber } from 'tinybench';
import type { Task, TaskResultCompleted } from 'tinybench';

export function getRuntimeLabel(): string {
    if (process.versions.bun) return `Bun ${process.versions.bun}`;
    return `Node ${process.version}`;
}

function isCompleted(task: Task): task is Task & { result: TaskResultCompleted } {
    return task.result.state === 'completed';
}

/** Print a formatted results table for completed benchmark tasks. */
export function printResults(scenario: string, tasks: Task[]): void {
    const completed = tasks.filter(isCompleted);
    if (completed.length === 0) {
        console.log(`\n${scenario}\n  (no completed tasks)\n`);
        return;
    }

    const fastest = completed[0]!;
    const fastestOps = fastest.result.throughput.mean;

    console.log(`\n${scenario}`);
    console.log(`Runtime: ${getRuntimeLabel()}\n`);

    const nameWidth = Math.max(4, ...completed.map((task) => task.name.length));

    console.log(
        `${'Method'.padEnd(nameWidth)}  ${'ops/s'.padStart(12)}  ${'relative'.padStart(10)}  ${'p99 (ms)'.padStart(10)}`,
    );
    console.log(`${'-'.repeat(nameWidth + 40)}`);

    for (const task of completed) {
        const result = task.result;
        const ops = result.throughput.mean;
        const relative = fastestOps / ops;
        const p99 = result.latency.p99;

        const relativeLabel = task === fastest ? '1.00x' : `${relative.toFixed(2)}x`;
        console.log(
            `${task.name.padEnd(nameWidth)}  ${formatOps(ops).padStart(12)}  ${relativeLabel.padStart(10)}  ${formatNumber(p99, 3).padStart(10)}`,
        );
    }

    console.log(`\nFastest: ${fastest.name}`);
}

function formatOps(ops: number): string {
    if (ops >= 1_000_000) return `${formatNumber(ops / 1_000_000, 3)}M`;
    if (ops >= 1_000) return `${formatNumber(ops / 1_000, 3)}k`;
    return formatNumber(ops, 3);
}
