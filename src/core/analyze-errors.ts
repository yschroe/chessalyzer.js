import type {
    AnalyzeError,
    ReplayError,
    ReplayErrorContext,
    ReplayErrorReason,
} from '#types/errors';

/** Maximum errors collected per analysis run (across all runs). */
export const MAX_COLLECTED_ERRORS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function createReplayError(
    ctx: ReplayErrorContext,
    reason: ReplayErrorReason,
    message: string,
    cause?: unknown,
): ReplayError {
    return {
        code: 'replay',
        gameIndex: ctx.gameIndex,
        moveIndex: ctx.moveIndex,
        san: ctx.san,
        reason,
        message,
        cause,
    };
}

/**
 * Type guard for replay failures from `analyzePGN`.
 *
 * Works on errors thrown in abort mode (`onError: 'abort'`, the default) and on
 * entries in `AnalyzeResult.errors` when using `onError: 'skip-game'`.
 *
 * @example
 * ```ts
 * try {
 *   await analyzePGN('games.pgn');
 * } catch (err) {
 *   if (isReplayError(err)) {
 *     console.error(`Game ${err.gameIndex}, move ${err.moveIndex}: ${err.san}`);
 *   }
 * }
 * ```
 */
export function isReplayError(err: unknown): err is ReplayError {
    if (!isRecord(err)) return false;
    return err.code === 'replay' && typeof err.gameIndex === 'number';
}

/**
 * Plain cloneable payload for worker → main abort reporting.
 * Omits `cause` so structured clone never has to ferry Error instances.
 */
export function toWorkerBatchError(err: unknown): string | AnalyzeError {
    if (isReplayError(err)) {
        const payload: ReplayError = {
            code: err.code,
            gameIndex: err.gameIndex,
            moveIndex: err.moveIndex,
            san: err.san,
            reason: err.reason,
            message: err.message,
        };
        return payload;
    }
    return err instanceof Error ? err.message : String(err);
}

/** Rebuild a thrown error from a worker batch `error` field (string or structured). */
export function errorFromWorkerBatchFailure(error: string | AnalyzeError): Error {
    if (typeof error === 'string') return new Error(error);
    if (isReplayError(error)) return toAbortError(error);
    return new Error(error.message);
}

/** Thrown in abort mode; replay fields are copied onto the error for {@link isReplayError}. */
export function toAbortError(replayError: ReplayError): Error {
    const err = new Error(replayError.message);
    err.name = 'AnalyzeAbortError';
    Object.assign(err, {
        code: replayError.code,
        gameIndex: replayError.gameIndex,
        moveIndex: replayError.moveIndex,
        san: replayError.san,
        reason: replayError.reason,
        cause: replayError.cause,
    });
    return err;
}

/**
 * Extract a typed {@link AnalyzeError} from an unknown caught value.
 *
 * Equivalent to `isReplayError(err) ? err : undefined` — useful when you want
 * `AnalyzeError | undefined` without a separate type-narrowing branch.
 */
export function getAnalyzeError(err: unknown): AnalyzeError | undefined {
    if (isReplayError(err)) return err;
    return undefined;
}

export function collectError(errors: AnalyzeError[], err: AnalyzeError): void {
    if (errors.length < MAX_COLLECTED_ERRORS) {
        errors.push(err);
    }
}
