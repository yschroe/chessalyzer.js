import type { Tracker } from '#types/tracker';

/** User-facing analysis configuration passed to {@link Chessalyzer.analyzePGN}. */
export interface AnalysisConfig {
    trackers?: Tracker[];
    config?: {
        cntGames?: number;
        filter?: (game: object) => boolean;
    };
}

/** Multithread chunking options. `null` disables worker threads. */
export interface MultithreadConfig {
    /** Target raw PGN chunk size in bytes before aligning to a game boundary. */
    targetBytes?: number;
    /** Worker thread count. Defaults to `os.availableParallelism()`. */
    workerCount?: number;
    /** Safety cap on lines per chunk. */
    maxLines?: number;
    /** Minimum lines before a byte-target chunk may be emitted. */
    minLines?: number;
    /**
     * @deprecated Use `targetBytes` instead. Ignored by the worker-side parse path.
     * Still used by the legacy MT path (filter / `cntGames`).
     */
    batchSize?: number;
}

/** Counters emitted for one game or merged batch. */
export interface GameAndMoveCount {
    cntGames: number;
    cntMoves: number;
}

/** {@link GameAndMoveCount} plus throughput from analyzePGN. */
export interface GameAndMoveCountFull extends GameAndMoveCount {
    mps: number;
}
