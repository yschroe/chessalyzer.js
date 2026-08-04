import type { TrackerSnapshot } from '#core/worker-types';
import type { Action } from '#types/actions';
import type { ParsedGame } from '#types/parse-pgn';
import type { GameTrackerDef, MoveTrackerDef, TrackerInstance } from '#types/tracker';

type MoveEntry = TrackerInstance<unknown, unknown, MoveTrackerDef>;
type GameEntry = TrackerInstance<unknown, unknown, GameTrackerDef>;
type OrderedEntry = { kind: 'move'; entry: MoveEntry } | { kind: 'game'; entry: GameEntry };

/**
 * Per-thread tracker engine: pairs instances with mutable state,
 * drives hooks in the hot loop, and produces merge snapshots.
 *
 * `entry.state` aliases `instance.state` so the hot path keeps a direct field
 * (no `entry.instance.state` hop). Trackers mutate state in place, so identity
 * is preserved for the whole run.
 */
export class TrackerHost {
    readonly moveEntries: MoveEntry[];
    readonly gameEntries: GameEntry[];
    private readonly orderedEntries: OrderedEntry[];

    constructor(instances: readonly TrackerInstance[]) {
        this.moveEntries = [];
        this.gameEntries = [];
        this.orderedEntries = [];

        for (const instance of instances) {
            const { def, state } = instance;
            if (def.kind === 'move') {
                const entry: MoveEntry = { def, state };
                this.moveEntries.push(entry);
                this.orderedEntries.push({ kind: 'move', entry });
            } else {
                const entry: GameEntry = { def, state };
                this.gameEntries.push(entry);
                this.orderedEntries.push({ kind: 'game', entry });
            }
        }
    }

    trackGame(game: ParsedGame): void {
        for (const entry of this.gameEntries) {
            entry.def.track(entry.state, game);
        }
    }

    trackMoves(actions: Action[]): void {
        for (const entry of this.moveEntries) {
            entry.def.track(entry.state, actions);
        }
    }

    onGameEnd(): void {
        for (const entry of this.moveEntries) {
            entry.def.onGameEnd?.(entry.state);
        }
        for (const entry of this.gameEntries) {
            entry.def.onGameEnd?.(entry.state);
        }
    }

    onFinish(): void {
        for (const entry of this.gameEntries) {
            entry.def.onFinish?.(entry.state);
        }
        for (const entry of this.moveEntries) {
            entry.def.onFinish?.(entry.state);
        }
    }

    snapshots(): TrackerSnapshot[] {
        return this.orderedEntries.map((ordered, index) => ({
            index,
            state: ordered.entry.state,
        }));
    }

    mergeSnapshots(snapshots: readonly TrackerSnapshot[]): void {
        for (const snap of snapshots) {
            const ordered = this.orderedEntries[snap.index];
            if (!ordered) continue;
            const { def, state } = ordered.entry;
            def.merge(state, snap.state);
        }
    }
}
