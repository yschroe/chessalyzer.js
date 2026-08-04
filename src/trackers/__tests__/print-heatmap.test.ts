import { describe, expect, it } from 'bun:test';

import { heatmapToString } from '#trackers/print-heatmap';

describe('heatmapToString', () => {
    it('returns ANSI output for a single-cell heatmap', () => {
        const output = heatmapToString({ map: [[1]], min: 0, max: 1 });
        expect(output).toContain('\x1b[');
        expect(output.endsWith('\n')).toBe(true);
    });
});
