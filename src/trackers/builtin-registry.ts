import { gameTracker } from '#trackers/game-tracker';
import { pieceTracker } from '#trackers/piece-tracker';
import { tileTracker } from '#trackers/tile/tile-tracker';
import type { TrackerFactory } from '#types/tracker';

const BUILTIN_TRACKER_FACTORIES_LIST: readonly TrackerFactory[] = [
    pieceTracker,
    tileTracker,
    gameTracker,
];

/** Stable ids for built-in tracker definitions. */
export const BUILTIN_TRACKER_IDS: ReadonlySet<string> = new Set(
    BUILTIN_TRACKER_FACTORIES_LIST.map((factory) => factory.def.id),
);

/** Registry of built-in tracker factories keyed by definition id. */
export const BUILTIN_TRACKER_FACTORIES: Record<string, TrackerFactory> = Object.fromEntries(
    BUILTIN_TRACKER_FACTORIES_LIST.map((factory) => [factory.def.id, factory]),
);
