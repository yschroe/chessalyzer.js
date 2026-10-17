/**
 * Compare result detection with the pre-optimization regex, independently of SAN extraction.
 * Run sequentially on each runtime:
 *   node --import tsx bench/exploratory/bench-result-suffix.ts
 *   bun bench/exploratory/bench-result-suffix.ts
 * BENCH_RUNS controls samples (default 3); BENCH_RESULT_LOOPS controls repetitions.
 * Each case consumes every result and validates it outside timing. Alternate order
 * across rounds to expose warmup/order effects; full analysis remains the deciding bench.
 */
import assert from 'node:assert/strict';

import { extractGameResult } from '#pgn/movetext';
import { printTimedResults, runTimed } from '~/bench/lib/timing';

const resultRegex = /(1-0|0-1|1\/2-1\/2|\*)\s*$/;
const implementations = [
    { name: 'regex', extract: (line: string) => resultRegex.exec(line)?.[1] ?? null },
    { name: 'suffix', extract: extractGameResult },
];
const loops = Number(process.env.BENCH_RESULT_LOOPS ?? 100_000);
const runs = Number(process.env.BENCH_RUNS ?? 3);
const results = [];

for (const repeats of [1, 100]) {
    const prefix = '1. e4 e5 2. Nf3 Nc6 '.repeat(repeats);
    for (const matches of [true, false]) {
        for (const whitespace of ['', ' \t\r\n\u00a0\u2028\ufeff']) {
            const endings = matches ? ['1-0', '0-1', '1/2-1/2', '*'] : ['e4', 'Nf3+', '1-0!', ''];
            const lines = endings.map((ending) => prefix + ending + whitespace);
            const expected = matches ? 14 * loops : 0;
            const label = `${repeats === 1 ? 'short' : 'long'} / ${matches ? 'match' : 'miss'} / ${whitespace ? 'whitespace' : 'plain'}`;
            for (let round = 0; round < 2; round += 1) {
                const ordered = round === 0 ? implementations : implementations.toReversed();
                for (const { name, extract } of ordered) {
                    for (const line of lines) {
                        assert.equal(extract(line), resultRegex.exec(line)?.[1] ?? null);
                    }
                    const result = await runTimed(
                        `${label} / ${name} / round ${round + 1}`,
                        async () => {
                            let checksum = 0;
                            for (let i = 0; i < loops; i += 1) {
                                for (const line of lines) checksum += extract(line)?.length ?? 0;
                            }
                            return checksum;
                        },
                        { runs, warmup: true, progress: false },
                    );
                    for (const sample of result.samples) assert.equal(sample.value, expected);
                    console.log(JSON.stringify(result));
                    results.push(result);
                }
            }
        }
    }
}
printTimedResults(results, { stddev: true, cv: true });
