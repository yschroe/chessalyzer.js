export interface AnalyzeError {
    /** Error category. Open union — new codes (e.g. `'parse'`) may be added without a major version bump. */
    code: 'replay';
    message: string;
    cause?: unknown;
}

/**
 * Reason for a replay failure.
 * Union is open — new reasons may be added without a major version bump.
 */
export type ReplayErrorReason = 'IllegalMove' | 'UnknownToken';

export interface ReplayError extends AnalyzeError {
    code: 'replay';
    gameIndex: number;
    moveIndex?: number;
    san?: string;
    reason: ReplayErrorReason;
}

export interface ReplayErrorContext {
    gameIndex: number;
    moveIndex?: number;
    san?: string;
}
