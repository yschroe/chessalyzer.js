import type { AnalyzeResult } from '#types/analysis';
import type { StateOf, TrackerDef } from '#types/tracker';

/**
 * Resolve accumulated state for a tracker definition in an {@link analyzePGN} result.
 *
 * Looks up by definition identity (`tracker === def`), not array index.
 *
 * When `runIndex` is omitted, searches all runs and returns the unique match.
 * If the same definition appears in more than one run, pass `runIndex` to disambiguate.
 */
export function getTrackerState<D extends TrackerDef>(
    result: AnalyzeResult,
    def: D,
    runIndex?: number,
): StateOf<D> {
    if (runIndex !== undefined) {
        const entry = result.runs[runIndex]?.trackers.find((t) => t.tracker === def);
        if (!entry) {
            throw new Error(`Tracker "${def.id}" not found in run ${runIndex}`);
        }
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- identity check ties state to D
        return entry.state as StateOf<D>;
    }

    const matches = result.runs.flatMap((run) => run.trackers).filter((t) => t.tracker === def);
    if (matches.length > 1) {
        throw new Error(
            `Tracker "${def.id}" appears in multiple runs; pass runIndex to disambiguate`,
        );
    }
    const entry = matches[0];
    if (!entry) {
        throw new Error(`Tracker "${def.id}" not found in result`);
    }
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- identity check ties state to D
    return entry.state as StateOf<D>;
}
