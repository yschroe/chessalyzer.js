import { GameTracker } from '#trackers/game-tracker';
import { PieceTracker } from '#trackers/piece-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { TrackerDef } from '#types/tracker';

const BUILTIN_TRACKER_CLASSES = [PieceTracker, TileTracker, GameTracker] as const;

/** Stable ids for built-in tracker definitions. */
export const BUILTIN_TRACKER_IDS = new Set(
    BUILTIN_TRACKER_CLASSES.map((TrackerClass) => new TrackerClass().id),
);

type TrackerFactory = () => TrackerDef;

/** Registry of built-in tracker factories keyed by id. */
export const BUILTIN_TRACKER_FACTORIES: Record<string, TrackerFactory> = Object.fromEntries(
    BUILTIN_TRACKER_CLASSES.map((TrackerClass) => {
        const instance = new TrackerClass();
        return [instance.id, () => new TrackerClass()];
    }),
);
