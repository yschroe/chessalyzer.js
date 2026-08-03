import type { OpenUnion } from '#types/open-union';

export interface AnalyzeError {
    /** Error category. Known value `'replay'`; additional codes may appear in future releases. */
    code: OpenUnion<'replay'>;
    message: string;
    cause?: unknown;
}

/**
 * Reason for a replay failure.
 * Known values are listed; additional string reasons may appear in future releases.
 */
export type ReplayErrorReason = OpenUnion<'IllegalMove' | 'UnknownToken'>;

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
