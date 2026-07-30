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

/** Reserved for future PGN parse failures — not exported until parse emits these. */
export interface ParseError extends AnalyzeError {
    code: 'parse';
    gameIndex?: number;
    reason: string;
}

export interface ReplayErrorContext {
    gameIndex: number;
    moveIndex?: number;
    san?: string;
}
