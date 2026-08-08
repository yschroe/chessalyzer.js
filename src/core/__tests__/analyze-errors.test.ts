import { describe, expect, it } from 'bun:test';

import {
    createReplayError,
    errorFromWorkerBatchFailure,
    getAnalyzeError,
    isReplayError,
    toAbortError,
    toWorkerBatchError,
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

    it('toWorkerBatchError strips cause and keeps replay fields', () => {
        const thrown = toAbortError({ ...replayError, cause: new Error('inner') });
        const payload = toWorkerBatchError(thrown);
        expect(isReplayError(payload)).toBe(true);
        if (isReplayError(payload)) {
            expect(payload.gameIndex).toBe(2);
            expect(payload.moveIndex).toBe(5);
            expect(payload.san).toBe('Qh5');
            expect(payload.reason).toBe('IllegalMove');
            expect(payload.message).toBe('illegal move');
            expect(payload.cause).toBeUndefined();
        }
    });

    it('toWorkerBatchError falls back to a message string', () => {
        expect(toWorkerBatchError(new Error('boom'))).toBe('boom');
        expect(toWorkerBatchError('plain')).toBe('plain');
    });

    it('errorFromWorkerBatchFailure rebuilds AnalyzeAbortError from a structured payload', () => {
        const rebuilt = errorFromWorkerBatchFailure(replayError);
        expect(rebuilt.name).toBe('AnalyzeAbortError');
        expect(isReplayError(rebuilt)).toBe(true);
        if (isReplayError(rebuilt)) {
            expect(rebuilt.gameIndex).toBe(2);
            expect(rebuilt.san).toBe('Qh5');
        }
    });

    it('errorFromWorkerBatchFailure keeps plain string failures as Error', () => {
        const rebuilt = errorFromWorkerBatchFailure('Unknown tracker "x"');
        expect(rebuilt).toBeInstanceOf(Error);
        expect(rebuilt.message).toBe('Unknown tracker "x"');
        expect(isReplayError(rebuilt)).toBe(false);
    });
});
