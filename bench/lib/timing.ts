import { performance } from 'node:perf_hooks';

export interface TimingStats {
    meanMs: number;
    stddevMs: number;
    minMs: number;
    cvPct: number;
}

export interface TimedRunResult extends TimingStats {
    label: string;
}

export function formatSeconds(ms: number): string {
    return (ms / 1000).toFixed(3);
}

export function computeTimingStats(times: number[]): TimingStats {
    const meanMs = times.reduce((sum, ms) => sum + ms, 0) / times.length;
    const variance =
        times.reduce((sum, ms) => sum + (ms - meanMs) ** 2, 0) / Math.max(times.length - 1, 1);
    const stddevMs = Math.sqrt(variance);
    const minMs = Math.min(...times);

    return {
        meanMs,
        stddevMs,
        minMs,
        cvPct: meanMs === 0 ? 0 : (stddevMs / meanMs) * 100,
    };
}

/** Run an async function repeatedly and collect wall-clock timings. */
export async function runTimedIterations(
    label: string,
    runs: number,
    fn: () => Promise<unknown>,
    options: { warmup?: boolean; logProgress?: boolean } = {},
): Promise<TimedRunResult> {
    const warmup = options.warmup ?? true;
    const logProgress = options.logProgress ?? false;

    if (warmup) await fn();

    const times: number[] = [];
    for (let i = 0; i < runs; i += 1) {
        if (logProgress) console.log(`Running ${label}... (${i + 1} of ${runs})`);
        const t0 = performance.now();
        await fn();
        times.push(performance.now() - t0);
    }

    return { label, ...computeTimingStats(times) };
}

function relativeSpeedLabel(meanMs: number, fastestMeanMs: number): string {
    if (meanMs === fastestMeanMs) return '1.00x';
    return `${(meanMs / fastestMeanMs).toFixed(2)}x slower`;
}

/** Print mean/min/(optional stddev, CV) table for timed benchmark runs. */
export function printTimedResults(
    rows: TimedRunResult[],
    columns: { stddev?: boolean; cv?: boolean; movesPerSec?: number[] } = {},
): void {
    const nameWidth = Math.max(...rows.map((row) => row.label.length), 6);
    const showStddev = columns.stddev ?? false;
    const showCv = columns.cv ?? false;
    const movesPerSec = columns.movesPerSec;

    const headers = ['mean (s)'];
    if (showStddev) headers.unshift('± (s)');
    headers.push('min (s)');
    if (showCv) headers.push('CV %');
    if (movesPerSec) headers.push('moves/s');

    console.log(
        `\n${'Scenario'.padEnd(nameWidth)}  ${headers.map((header) => header.padStart(Math.max(header.length, 9))).join('  ')}`,
    );
    console.log(`${'-'.repeat(nameWidth + headers.length * 11)}`);

    for (const [index, row] of rows.entries()) {
        const parts = [formatSeconds(row.meanMs).padStart(9)];
        if (showStddev) parts.unshift(formatSeconds(row.stddevMs).padStart(9));
        parts.push(formatSeconds(row.minMs).padStart(9));
        if (showCv) parts.push(row.cvPct.toFixed(1).padStart(7));
        if (movesPerSec) parts.push(movesPerSec[index]!.toLocaleString().padStart(12));
        console.log(`${row.label.padEnd(nameWidth)}  ${parts.join('  ')}`);
    }
}

/** Print a simpler mean/min/relative comparison table. */
export function printRelativeTimingComparison(
    rows: Array<{ label: string; meanMs: number; minMs: number }>,
): { fastest: (typeof rows)[number] } {
    const fastest = rows.reduce((best, row) => (row.meanMs < best.meanMs ? row : best));
    const nameWidth = Math.max(...rows.map((row) => row.label.length));

    console.log(
        `${'Method'.padEnd(nameWidth)}  ${'mean (s)'.padStart(9)}  ${'min (s)'.padStart(9)}  ${'relative'.padStart(10)}`,
    );
    console.log(`${'-'.repeat(nameWidth + 33)}`);

    for (const row of rows) {
        console.log(
            `${row.label.padEnd(nameWidth)}  ${formatSeconds(row.meanMs).padStart(9)}  ${formatSeconds(row.minMs).padStart(9)}  ${relativeSpeedLabel(row.meanMs, fastest.meanMs).padStart(10)}`,
        );
    }

    return { fastest };
}
