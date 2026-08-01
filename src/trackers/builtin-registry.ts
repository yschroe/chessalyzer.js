import { GameTracker } from '#trackers/game-tracker';
import { PieceTracker } from '#trackers/piece-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { TrackerDef } from '#types/tracker';

const BUILTIN_TRACKER_DEFS: readonly TrackerDef[] = [PieceTracker, TileTracker, GameTracker];

/** Stable ids for built-in tracker definitions. */
export const BUILTIN_TRACKER_IDS: ReadonlySet<string> = new Set(
    BUILTIN_TRACKER_DEFS.map((def) => def.id),
);

type TrackerFactory = () => TrackerDef;

/** Registry of built-in tracker definitions keyed by id. */
export const BUILTIN_TRACKER_FACTORIES: Record<string, TrackerFactory> = Object.fromEntries(
    BUILTIN_TRACKER_DEFS.map((def) => [def.id, () => def]),
);
