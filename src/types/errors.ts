/** Error category on {@link AnalyzeError}. `'parse'` is reserved for future PGN parse failures. */
export type AnalyzeErrorCode = 'replay' | 'parse';

export interface AnalyzeError {
    code: AnalyzeErrorCode;
    message: string;
    cause?: unknown;
}

export type ReplayErrorReason = 'IllegalMove' | 'AmbiguousSan' | 'UnknownToken';

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
