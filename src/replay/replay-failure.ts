import type { ReplayErrorReason } from '#types/errors';

/**
 * Internal signal thrown during SAN replay before {@link GameReplayer} adds game/move context.
 * Not part of the public API — converted to {@link ReplayError} at the replayer boundary.
 */
export class ReplayFailure extends Error {
    readonly reason: ReplayErrorReason;

    constructor(reason: ReplayErrorReason, message: string) {
        super(message);
        this.name = 'ReplayFailure';
        this.reason = reason;
    }
}

export function isReplayFailure(err: unknown): err is ReplayFailure {
    return err instanceof ReplayFailure;
}
