import { describe, expect, it } from 'bun:test';

import { normalizeAnalysisConfigs } from '#core/analysis-config';
import type { AnalysisConfig } from '#types/analysis';

describe('normalizeAnalysisConfigs', () => {
    const baseCfg: AnalysisConfig = { trackers: [] };

    it('sets readInHeader when filter is present', () => {
        const { readInHeader } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { filter: () => true } }],
            {},
        );
        expect(readInHeader).toBe(true);
    });

    it('sets readInHeader when maxGames is finite', () => {
        const { readInHeader } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { cntGames: 10 } }],
            {},
        );
        expect(readInHeader).toBe(false);
    });

    it('normalizes maxGames to cntGames on each config', () => {
        const { configs } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { cntGames: 100 } }],
            {},
        );
        expect(configs[0]?.config.cntGames).toBe(100);
        expect(configs[0]?.config.hasFilter).toBe(false);
    });

    it('marks hasFilter when a user filter is provided', () => {
        const { configs } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { filter: (g) => g.Result === '1-0' } }],
            {},
        );
        expect(configs[0]?.config.hasFilter).toBe(true);
    });

    it('returns configs for multithreaded and single-threaded runs', () => {
        const mt = normalizeAnalysisConfigs([baseCfg], {});
        const st = normalizeAnalysisConfigs([baseCfg], null);
        expect(mt.configs).toHaveLength(1);
        expect(st.configs).toHaveLength(1);
    });
});
