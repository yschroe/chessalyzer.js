import type { AnalyzeMultiRunResult, AnalyzeResult } from '#types/analysis';
import type { StateOf, TrackerDef } from '#types/tracker';

function isMultiRunResult(result: AnalyzeResult): result is AnalyzeMultiRunResult {
    return 'runs' in result && result.runs !== undefined;
}

function isStateForDef<D extends TrackerDef>(state: unknown, _def: D): state is StateOf<D> {
    return state !== undefined;
}

/**
 * Resolve accumulated state for a tracker definition in an {@link analyzePGN} result.
 *
 * Looks up by definition identity (`tracker === def`), not array index.
 */
export function getTrackerState<D extends TrackerDef>(
    result: AnalyzeResult,
    def: D,
    runIndex = 0,
): StateOf<D> {
    const trackers = isMultiRunResult(result) ? result.runs[runIndex]?.trackers : result.trackers;

    const entry = trackers?.find((t) => t.tracker === def);
    if (!entry) {
        throw new Error(`Tracker "${def.id}" not found in run ${runIndex}`);
    }
    if (!isStateForDef(entry.state, def)) {
        throw new Error(`Tracker "${def.id}" state missing in run ${runIndex}`);
    }

    return entry.state;
}
