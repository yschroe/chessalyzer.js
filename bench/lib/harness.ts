import { Bench, type Task } from 'tinybench';

export interface BenchCase {
    name: string;
    fn: () => unknown;
    setup?: () => void;
    teardown?: () => void;
}

export interface RunScenarioOptions {
    time?: number;
    warmupTime?: number;
    /** Log each task as it finishes (default true). */
    progress?: boolean;
}

const DEFAULT_TIME = Number(process.env.BENCH_TIME ?? 250);
const DEFAULT_WARMUP_TIME = Number(process.env.BENCH_WARMUP_TIME ?? 100);

/** Run a named group of micro-benchmark cases via tinybench. */
export async function runScenario(
    name: string,
    cases: BenchCase[],
    options: RunScenarioOptions = {},
): Promise<Task[]> {
    const time = options.time ?? DEFAULT_TIME;
    const warmupTime = options.warmupTime ?? DEFAULT_WARMUP_TIME;
    const progress = options.progress ?? true;

    const estSec = Math.ceil((cases.length * (time + warmupTime)) / 1000);
    console.log(`[${name}] ${cases.length} cases (~${estSec}s)...`);

    const bench = new Bench({
        time,
        warmup: true,
        warmupTime,
        timestampProvider: 'hrtimeNow',
        throws: true,
    });

    for (const benchCase of cases) {
        bench.add(benchCase.name, () => benchCase.fn(), {
            beforeEach: benchCase.setup,
            afterEach: benchCase.teardown,
            async: false,
        });
    }

    if (progress) {
        let finished = 0;
        for (const benchCase of cases) {
            const task = bench.getTask(benchCase.name);
            if (!task) continue;
            task.addEventListener('complete', () => {
                finished += 1;
                console.log(`  [${finished}/${cases.length}] ${benchCase.name}`);
            });
        }
    }

    await bench.run();

    return [...bench.tasks].sort((a, b) => throughputMean(b) - throughputMean(a));
}

function throughputMean(task: Task): number {
    const result = task.result;
    if (result.state !== 'completed') return 0;
    return result.throughput.mean;
}
