import type { AnalyzeMultiRunResult, AnalyzeResult } from '#types/analysis';
import type { AnalyzeTrackerResult, StateOf, TrackerDef } from '#types/tracker';

function isMultiRunResult(result: AnalyzeResult): result is AnalyzeMultiRunResult {
    return 'runs' in result && result.runs !== undefined;
}

function isStateForDef<D extends TrackerDef>(state: unknown, _def: D): state is StateOf<D> {
    return state !== undefined;
}

function trackerEntries(result: AnalyzeResult): AnalyzeTrackerResult[] {
    if (isMultiRunResult(result)) {
        return result.runs.flatMap((run) => run.trackers);
    }
    return result.trackers;
}

function resolveEntryState<D extends TrackerDef>(
    entry: AnalyzeTrackerResult | undefined,
    def: D,
    notFoundMessage: string,
    missingStateMessage: string,
): StateOf<D> {
    if (!entry) {
        throw new Error(notFoundMessage);
    }
    if (!isStateForDef(entry.state, def)) {
        throw new Error(missingStateMessage);
    }
    return entry.state;
}

function findInTrackers<D extends TrackerDef>(
    trackers: readonly AnalyzeTrackerResult[] | undefined,
    def: D,
    runIndex: number,
): StateOf<D> {
    return resolveEntryState(
        trackers?.find((t) => t.tracker === def),
        def,
        `Tracker "${def.id}" not found in run ${runIndex}`,
        `Tracker "${def.id}" state missing in run ${runIndex}`,
    );
}

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
        const trackers = isMultiRunResult(result)
            ? result.runs[runIndex]?.trackers
            : runIndex === 0
              ? result.trackers
              : undefined;
        return findInTrackers(trackers, def, runIndex);
    }

    const matches = trackerEntries(result).filter((t) => t.tracker === def);
    if (matches.length > 1) {
        throw new Error(
            `Tracker "${def.id}" appears in multiple runs; pass runIndex to disambiguate`,
        );
    }

    return resolveEntryState(
        matches[0],
        def,
        `Tracker "${def.id}" not found in result`,
        `Tracker "${def.id}" state missing in result`,
    );
}
