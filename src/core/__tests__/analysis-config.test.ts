import { describe, expect, it } from 'bun:test';

import { normalizeAnalysisConfigs } from '#core/analysis-config';
import type { AnalysisConfig } from '#types/analysis-runtime';

describe('normalizeAnalysisConfigs', () => {
    const baseCfg: AnalysisConfig = { trackers: [] };

    it('sets parseHeaders when filter is present', () => {
        const { parseHeaders } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { filter: () => true } }],
            {},
        );
        expect(parseHeaders).toBe(true);
    });

    it('sets parseHeaders false when maxGames is finite without filter', () => {
        const { parseHeaders } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { maxGames: 10 } }],
            {},
        );
        expect(parseHeaders).toBe(false);
    });

    it('normalizes maxGames on each config', () => {
        const { configs } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { maxGames: 100 } }],
            {},
        );
        expect(configs[0]?.config.maxGames).toBe(100);
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
