import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';

import { analyzePGN, getAnalyzeError, isReplayError } from 'chessalyzer';
import { PieceTracker } from 'chessalyzer/trackers';

const badSanPath = join(import.meta.dirname, '../fixtures/bad-san-mid-file.pgn');

describe('Error policy', () => {
    it('aborts on first bad game by default', async () => {
        let caught: unknown;
        try {
            await analyzePGN(badSanPath, { workers: false, trackers: [new PieceTracker()] });
        } catch (err) {
            caught = err;
        }

        expect(caught).toBeDefined();
        const analyzeError = getAnalyzeError(caught);
        expect(analyzeError).toBeDefined();
        expect(isReplayError(analyzeError)).toBe(true);
        if (isReplayError(analyzeError)) {
            expect(analyzeError.gameIndex).toBe(1);
            expect(analyzeError.reason).toBe('IllegalMove');
        }
    });

    it('skip-game continues with error summary (single-threaded)', async () => {
        const data = await analyzePGN(badSanPath, {
            workers: false,
            onError: 'skip-game',
            trackers: [new PieceTracker()],
        });

        expect(data.gameCount).toBe(2);
        expect(data.skippedGames).toBe(1);
        expect(data.errors?.length).toBe(1);
        expect(data.errors?.[0]?.code).toBe('replay');
        if (isReplayError(data.errors?.[0])) {
            expect(data.errors[0].gameIndex).toBe(1);
            expect(data.errors[0].reason).toBe('IllegalMove');
        }
    });

    it('skip-game continues with error summary (worker-parse)', async () => {
        const data = await analyzePGN(badSanPath, {
            onError: 'skip-game',
            trackers: [new PieceTracker()],
        });

        expect(data.gameCount).toBe(2);
        expect(data.skippedGames).toBe(1);
        expect(data.errors?.length).toBe(1);
    });

    it('skip-game with move tracker on actions replay path', async () => {
        const pieceTracker = new PieceTracker();
        const data = await analyzePGN(badSanPath, {
            trackers: [pieceTracker],
            workers: false,
            onError: 'skip-game',
        });

        expect(data.gameCount).toBe(2);
        expect(data.skippedGames).toBe(1);
        expect(data.moveCount).toBe(32);
    });
});
