import type { Action } from '#types/actions';
import type { ParsedGame } from '#types/parse-pgn';
import type {
    AnalyzeTrackerResult,
    GameTrackerDef,
    MoveTrackerDef,
    TrackerDef,
    TrackerSnapshot,
} from '#types/tracker';

interface MoveEntry {
    def: MoveTrackerDef;
    state: unknown;
}

interface GameEntry {
    def: GameTrackerDef;
    state: unknown;
}

type OrderedEntry = { kind: 'move'; entry: MoveEntry } | { kind: 'game'; entry: GameEntry };

/**
 * Per-thread tracker engine: pairs definitions with mutable state,
 * drives hooks in the hot loop, and produces merge snapshots.
 */
export class TrackerHost {
    readonly moveEntries: MoveEntry[];
    readonly gameEntries: GameEntry[];
    private readonly orderedEntries: OrderedEntry[];

    constructor(defs: readonly TrackerDef[]) {
        this.moveEntries = [];
        this.gameEntries = [];
        this.orderedEntries = [];

        for (const def of defs) {
            const state = def.init(def.options);
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
        const out: TrackerSnapshot[] = [];
        for (const entry of this.gameEntries) {
            out.push({ id: entry.def.id, state: entry.state });
        }
        for (const entry of this.moveEntries) {
            out.push({ id: entry.def.id, state: entry.state });
        }
        return out;
    }

    mergeSnapshots(snapshots: readonly TrackerSnapshot[]): void {
        const byId = new Map(snapshots.map((snap) => [snap.id, snap.state]));
        for (const entry of this.gameEntries) {
            const other = byId.get(entry.def.id);
            if (other !== undefined && entry.def.merge) {
                entry.def.merge(entry.state, other);
            }
        }
        for (const entry of this.moveEntries) {
            const other = byId.get(entry.def.id);
            if (other !== undefined && entry.def.merge) {
                entry.def.merge(entry.state, other);
            }
        }
    }

    results(): AnalyzeTrackerResult[] {
        return this.orderedEntries.map((ordered) => {
            const { def, state } = ordered.entry;
            return { tracker: def, state };
        });
    }
}
