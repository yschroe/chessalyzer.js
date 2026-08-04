import type { OpenUnion } from '#types/open-union';

export interface AnalyzeError {
    /** Error category. Known value `'replay'`; additional codes may appear in future releases. */
    code: OpenUnion<'replay'>;
    /** Human-readable description of what went wrong. */
    message: string;
    /** Original underlying error, when one was recorded. */
    cause?: unknown;
}

/**
 * Why a movetext half-move could not be replayed.
 * Known values are listed; additional string reasons may appear in future releases.
 */
export type ReplayErrorReason = OpenUnion<'IllegalMove' | 'UnknownToken'>;

/** A replay failure for one game (and usually one half-move) in the PGN stream. */
export interface ReplayError extends AnalyzeError {
    code: 'replay';
    /** Zero-based index of the game in the file (in processing order). */
    gameIndex: number;
    /** Zero-based half-move index within the game, when known. */
    moveIndex?: number;
    /** SAN token that failed to replay, when known. */
    san?: string;
    reason: ReplayErrorReason;
}

export interface ReplayErrorContext {
    gameIndex: number;
    moveIndex?: number;
    san?: string;
}
