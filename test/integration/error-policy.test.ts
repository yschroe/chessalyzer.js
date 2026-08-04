import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';

import { analyzePGN, getAnalyzeError, isReplayError } from 'chessalyzer';
import { pieceTracker } from 'chessalyzer/trackers';

const badSanPath = join(import.meta.dirname, '../fixtures/bad-san-mid-file.pgn');

describe('Error policy', () => {
    it('aborts on first bad game by default', async () => {
        let caught: unknown;
        try {
            await analyzePGN(badSanPath, { workers: false, trackers: [pieceTracker()] });
        } catch (err) {
            caught = err;
        }

        expect(caught).toBeDefined();
        expect(isReplayError(caught)).toBe(true);
        if (isReplayError(caught)) {
            expect(caught.gameIndex).toBe(1);
            expect(caught.reason).toBe('IllegalMove');
        }

        const analyzeError = getAnalyzeError(caught);
        expect(analyzeError).toBeDefined();
        expect(isReplayError(analyzeError)).toBe(true);
    });

    it('skip-game continues with error summary (single-threaded)', async () => {
        const data = await analyzePGN(badSanPath, {
            workers: false,
            onError: 'skip-game',
            trackers: [pieceTracker()],
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
            trackers: [pieceTracker()],
        });

        expect(data.gameCount).toBe(2);
        expect(data.skippedGames).toBe(1);
        expect(data.errors?.length).toBe(1);
    });

    it('skip-game with move tracker on actions replay path', async () => {
        const pieces = pieceTracker();
        const data = await analyzePGN(badSanPath, {
            trackers: [pieces],
            workers: false,
            onError: 'skip-game',
        });

        expect(data.gameCount).toBe(2);
        expect(data.skippedGames).toBe(1);
        expect(data.moveCount).toBe(32);
    });
});
