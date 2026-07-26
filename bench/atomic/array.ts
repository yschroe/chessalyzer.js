/**
 * Compare array append strategies used across the PGN parser.
 */
import { BULK, makeMoveTokens, makePgnLines, SINGLE } from '../lib/fixtures';
import { runScenario, type BenchCase } from '../lib/harness';
import { getRuntimeLabel, printResults } from '../lib/report';

const moveTokens = makeMoveTokens(SINGLE);
const pgnLines = makePgnLines(BULK);

function appendSingleCases(): BenchCase[] {
    const ctx = { arr: [] as string[] };

    return [
        {
            name: 'push_loop',
            setup: () => {
                ctx.arr = [];
            },
            fn: () => {
                const arr = ctx.arr;
                for (let i = 0; i < moveTokens.length; i += 1) arr.push(moveTokens[i]!);
                return arr.length;
            },
        },
        {
            name: 'push_spread_each',
            setup: () => {
                ctx.arr = [];
            },
            fn: () => {
                const arr = ctx.arr;
                for (let i = 0; i < moveTokens.length; i += 1) arr.push(...[moveTokens[i]!]);
                return arr.length;
            },
        },
        {
            name: 'index_assign',
            setup: () => {
                ctx.arr = [];
            },
            fn: () => {
                const arr = ctx.arr;
                for (let i = 0; i < moveTokens.length; i += 1) arr[arr.length] = moveTokens[i]!;
                return arr.length;
            },
        },
        {
            name: 'concat_single_loop',
            setup: () => {
                ctx.arr = [];
            },
            fn: () => {
                let arr: string[] = [];
                for (let i = 0; i < moveTokens.length; i += 1) arr = arr.concat(moveTokens[i]!);
                ctx.arr = arr;
                return arr.length;
            },
        },
    ];
}

function appendBulkCases(reuse: boolean): BenchCase[] {
    const ctx = { arr: [] as string[] };
    if (reuse) ctx.arr = [];

    const reset = reuse
        ? () => {
              ctx.arr.length = 0;
          }
        : () => {
              ctx.arr = [];
          };

    const cases: BenchCase[] = [
        {
            name: 'push_loop',
            setup: reset,
            fn: () => {
                const arr = ctx.arr;
                for (let i = 0; i < pgnLines.length; i += 1) arr.push(pgnLines[i]!);
                return arr.length;
            },
        },
        {
            name: 'push_spread',
            setup: reset,
            fn: () => {
                ctx.arr.push(...pgnLines);
                return ctx.arr.length;
            },
        },
        {
            name: 'concat_batch',
            setup: reset,
            fn: () => {
                ctx.arr = ctx.arr.concat(pgnLines);
                return ctx.arr.length;
            },
        },
        {
            name: 'concat_spread',
            setup: reset,
            fn: () => {
                ctx.arr = ctx.arr.concat(...pgnLines);
                return ctx.arr.length;
            },
        },
        {
            name: 'push_apply',
            setup: reset,
            fn: () => {
                ctx.arr.push.apply(ctx.arr, pgnLines);
                return ctx.arr.length;
            },
        },
        {
            name: 'splice_spread',
            setup: reset,
            fn: () => {
                ctx.arr.splice(ctx.arr.length, 0, ...pgnLines);
                return ctx.arr.length;
            },
        },
        {
            name: 'copy_loop',
            setup: reset,
            fn: () => {
                const arr = ctx.arr;
                for (let i = 0; i < pgnLines.length; i += 1) arr[arr.length++] = pgnLines[i]!;
                return arr.length;
            },
        },
    ];

    if (!reuse) {
        cases.push({
            name: 'literal_spread',
            setup: reset,
            fn: () => {
                ctx.arr = [...ctx.arr, ...pgnLines];
                return ctx.arr.length;
            },
        });
    }

    return cases;
}

export default async function runArrayBench(): Promise<void> {
    const t0 = Date.now();
    console.log(`Array append benchmarks (${getRuntimeLabel()})`);
    console.log(`Items: ${SINGLE} move tokens, ${BULK} PGN lines per bulk append`);
    console.log(
        `Timing: ${process.env.BENCH_TIME ?? 250}ms run / ${process.env.BENCH_WARMUP_TIME ?? 100}ms warmup per case (set BENCH_TIME for longer runs)\n`,
    );

    printResults(
        `appendSingle (${SINGLE} items, fresh array)`,
        await runScenario('appendSingle', appendSingleCases()),
    );

    printResults(
        `appendBulk (${BULK} items, fresh array)`,
        await runScenario('appendBulk', appendBulkCases(false)),
    );

    printResults(
        `appendBulk_reuse (${BULK} items, length = 0 reset)`,
        await runScenario('appendBulk_reuse', appendBulkCases(true)),
    );

    console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

if (import.meta.main) {
    await runArrayBench();
    process.exit(0);
}
