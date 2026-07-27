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

export function isReplayError(err: unknown): err is ReplayError {
    if (!isRecord(err)) return false;
    return err.code === 'replay' && typeof err.gameIndex === 'number';
}

/** Thrown in abort mode; carries the typed replay error for callers. */
class AnalyzeAbortError extends Error {
    readonly analyzeError: ReplayError;

    constructor(replayError: ReplayError) {
        super(replayError.message);
        this.name = 'AnalyzeAbortError';
        this.analyzeError = replayError;
    }
}

export function toAbortError(replayError: ReplayError): Error {
    return new AnalyzeAbortError(replayError);
}

export function getAnalyzeError(err: unknown): AnalyzeError | undefined {
    if (isReplayError(err)) return err;
    if (err instanceof AnalyzeAbortError) return err.analyzeError;
    return undefined;
}

export function collectError(errors: AnalyzeError[], err: AnalyzeError): void {
    if (errors.length < MAX_COLLECTED_ERRORS) {
        errors.push(err);
    }
}
