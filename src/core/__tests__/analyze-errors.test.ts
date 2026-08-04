import { describe, expect, it } from 'bun:test';

import {
    createReplayError,
    getAnalyzeError,
    isReplayError,
    toAbortError,
} from '#core/analyze-errors';

describe('analyze-errors', () => {
    const replayError = createReplayError(
        { gameIndex: 2, moveIndex: 5, san: 'Qh5' },
        'IllegalMove',
        'illegal move',
    );

    it('isReplayError recognizes a replay error object', () => {
        expect(isReplayError(replayError)).toBe(true);
    });

    it('toAbortError copies replay fields onto the thrown error', () => {
        const thrown = toAbortError(replayError);
        expect(thrown).toBeInstanceOf(Error);
        expect(isReplayError(thrown)).toBe(true);
        if (isReplayError(thrown)) {
            expect(thrown.gameIndex).toBe(2);
            expect(thrown.moveIndex).toBe(5);
            expect(thrown.san).toBe('Qh5');
            expect(thrown.reason).toBe('IllegalMove');
        }
    });

    it('getAnalyzeError unwraps abort errors via isReplayError', () => {
        const thrown = toAbortError(replayError);
        const unwrapped = getAnalyzeError(thrown);
        expect(unwrapped).toBeDefined();
        expect(isReplayError(unwrapped)).toBe(true);
        if (isReplayError(unwrapped)) {
            expect(unwrapped.gameIndex).toBe(2);
        }
    });
});
