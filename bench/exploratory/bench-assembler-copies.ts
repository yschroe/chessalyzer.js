/**
 * Compare GameAssembler move accumulation strategies on single-line and wrapped movetext.
 * Run sequentially on each runtime:
 *   node --import tsx bench/exploratory/bench-assembler-copies.ts
 *   bun bench/exploratory/bench-assembler-copies.ts
 * BENCH_RUNS controls samples (default 3).
 *
 * Strategies (each line's tokens come from `extractMoves`, a fresh array per call):
 *   - concat       — pre-candidate-3 behavior: always `moves = moves.concat(matched)`
 *   - adopt        — adopt the first line's array, `concat` subsequent lines
 *   - adopt_push   — adopt the first line's array, push subsequent tokens in place
 *
 * Operation counts (`copied`) sum the lengths of arrays produced by `concat` /
 * elements pushed, independent of timing. Doubling wrapped line counts should
 * quadruple `concat` / `adopt` copies but only double `adopt_push`.
 */
import assert from 'node:assert/strict';

import { extractMoves } from '#pgn/movetext';
import { printTimedResults, runTimed } from '~/bench/lib/timing';

interface Strategy {
    name: string;
    append: (moves: string[], matched: string[], counter: { copied: number }) => string[];
}

const strategies: Strategy[] = [
    {
        name: 'concat',
        append: (moves, matched, counter) => {
            const next = moves.concat(matched);
            counter.copied += next.length;
            return next;
        },
    },
    {
        name: 'adopt',
        append: (moves, matched, counter) => {
            if (moves.length === 0) return matched;
            const next = moves.concat(matched);
            counter.copied += next.length;
            return next;
        },
    },
    {
        name: 'adopt_push',
        append: (moves, matched, counter) => {
            if (moves.length === 0) return matched;
            for (let i = 0; i < matched.length; i++) moves.push(matched[i]!);
            counter.copied += matched.length;
            return moves;
        },
    },
];

/** Assemble move arrays for `games` games, each spanning `lines` movetext lines. */
function assemble(strategy: Strategy, gameLines: string[], games: number, counter: { copied: number }) {
    let total = 0;
    for (let g = 0; g < games; g++) {
        let moves: string[] = [];
        for (let i = 0; i < gameLines.length; i++) {
            const matched = extractMoves(gameLines[i]!);
            if (matched) moves = strategy.append(moves, matched, counter);
        }
        total += moves.length;
    }
    return total;
}

const runs = Number(process.env.BENCH_RUNS ?? 3);
const singleLine =
    '1. e4 d5 2. Nf3 dxe4 3. Ne5 Nf6 4. d4 exd3 5. Bxd3 e6 6. Nc3 Bd6 7. Nc4 Nc6 8. Bg5 Be7 9. Qd2 Nb4 10. O-O-O Nxd3+ 11. Qxd3 Qxd3 12. Rxd3 O-O 13. Nb5 c6 14. Nc7 Rb8 15. Rg1 Nd5 16. Bxe7 Nxe7 17. Rg3 Nd5 18. Nxd5 exd5 19. Nd6 Be6 20. Rb3 b6';

const workloads = [
    { label: 'single-line (40 moves)', lines: [singleLine], games: 200_000 },
    { label: 'wrapped 8 lines (40 moves)', lines: wrap(singleLine, 8), games: 200_000 },
    // Structural stress input from PERFORMANCE.md: `1. e4 e5` repeated N times.
    ...[1000, 2000, 4000].map((n) => ({
        label: `stress ${n} lines`,
        lines: Array.from({ length: n }, () => '1. e4 e5'),
        games: 20,
    })),
];

/** Split a single movetext line into `parts` lines on token boundaries. */
function wrap(line: string, parts: number): string[] {
    const tokens = line.split(' ');
    const size = Math.ceil(tokens.length / parts);
    return Array.from({ length: parts }, (_, i) => tokens.slice(i * size, (i + 1) * size).join(' '));
}

const results = [];
for (const { label, lines, games } of workloads) {
    const expectedMoves = lines.reduce((n, l) => n + (extractMoves(l)?.length ?? 0), 0) * games;
    const counts: Record<string, number> = {};
    for (let round = 0; round < 2; round++) {
        const ordered = round === 0 ? strategies : strategies.toReversed();
        for (const strategy of ordered) {
            const counter = { copied: 0 };
            assert.equal(assemble(strategy, lines, 1, counter), expectedMoves / games);
            counts[strategy.name] = counter.copied;
            const result = await runTimed(
                `${label} / ${strategy.name} / round ${round + 1}`,
                async () => assemble(strategy, lines, games, { copied: 0 }),
                { runs, warmup: true, progress: false },
            );
            for (const sample of result.samples) assert.equal(sample.value, expectedMoves);
            results.push(result);
        }
    }
    console.log(`${label}: copied elements per game ${JSON.stringify(counts)}`);
}
printTimedResults(results, { stddev: true, cv: true });
