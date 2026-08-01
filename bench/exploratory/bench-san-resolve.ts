/**
 * Micro-benchmark for the SAN replay hot path ({@link SanApplier} / {@link SanDecoder}).
 *
 * Isolates move resolution from I/O, PGN parse, and worker dispatch so resolver
 * changes (e.g. the shared `san-resolver.ts` extraction) can be A/B measured
 * without e2e noise. Replays real games parsed once from a slice of the largest
 * local PGN; games with unsupported SAN are skipped like `onError: 'skip-game'`.
 *
 * Usage: bun bench/exploratory/bench-san-resolve.ts
 * Env: BENCH_RUNS (default 5), BENCH_SAN_GAMES (default 50000)
 */
import { closeSync, openSync, readSync } from 'node:fs';

import { parseGamesFromLines } from '#pgn/game-assembler';
import SanApplier from '#replay/san-applier';
import SanContext from '#replay/san-context';
import SanDecoder from '#replay/san-decoder';

import { findLargestPgn } from '../lib/pgn-fixture';
import { printTimedResults, runTimed } from '../lib/timing';

const GAME_COUNT = Number(process.env.BENCH_SAN_GAMES ?? 50_000);
const RUNS = Number(process.env.BENCH_RUNS ?? 5);
/** ~1 KB per game on the Lichess exports; 2x headroom for the game count target. */
const SLICE_BYTES = GAME_COUNT * 2048;

function readSlice(path: string, bytes: number): string {
    const fd = openSync(path, 'r');
    try {
        const buf = Buffer.alloc(bytes);
        const bytesRead = readSync(fd, buf, 0, bytes, 0);
        return buf.toString('utf8', 0, bytesRead);
    } finally {
        closeSync(fd);
    }
}

const source = findLargestPgn();
const games = parseGamesFromLines(readSlice(source.path, SLICE_BYTES).split('\n'), {
    parseHeaders: false,
    maxGames: GAME_COUNT,
});
const totalMoves = games.reduce((sum, game) => sum + game.moves.length, 0);
console.log(
    `Loaded ${games.length} games (${totalMoves} moves) from ${source.name} — ${RUNS} runs per scenario`,
);

const ctx = new SanContext();
const applier = new SanApplier(ctx);
const decoder = new SanDecoder(ctx);

/** Mirror of the GameReplayer 'board' loop. */
function replayBoard(): void {
    for (const game of games) {
        ctx.reset();
        try {
            for (const san of game.moves) {
                applier.apply(san);
                ctx.activePlayer = ctx.activePlayer === 'w' ? 'b' : 'w';
            }
        } catch {
            // skip-game
        }
    }
}

/** Mirror of the GameReplayer 'actions' loop (without trackers). */
function replayActions(): void {
    for (const game of games) {
        ctx.reset();
        try {
            for (const san of game.moves) {
                const actions = decoder.decodeSan(san);
                ctx.board.applyActions(actions);
                ctx.activePlayer = ctx.activePlayer === 'w' ? 'b' : 'w';
            }
        } catch {
            // skip-game
        }
    }
}

const board = await runTimed('apply (board)', async () => replayBoard(), { runs: RUNS });
const actions = await runTimed('decode (actions)', async () => replayActions(), { runs: RUNS });

printTimedResults([board, actions], {
    stddev: true,
    cv: true,
    movesPerSec: [board, actions].map((row) => Math.round(totalMoves / (row.meanMs / 1000))),
});
