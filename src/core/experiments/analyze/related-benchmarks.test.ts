import { describe, it, expect, vi } from 'vitest';
import { summarizeRelatedExperiments } from './related-benchmarks.js';
import { SourceSignalRegistry } from './source-signals.js';

const focal = { id: 1, primary_metric_id: 100 };

const related = [
  {
    id: 2,
    name: 'r2',
    state: 'stopped',
    started_at: '2024-01-01',
    stopped_at: '2024-02-01',
    primary_metric_id: 100,
    primary_metric: { name: 'Conversions' },
  },
  {
    id: 3,
    name: 'r3',
    state: 'running',
    started_at: '2024-03-01',
    stopped_at: null,
    primary_metric_id: 100,
    primary_metric: { name: 'Conversions' },
  },
  {
    id: 4,
    name: 'r4',
    state: 'running',
    started_at: '2024-04-01',
    stopped_at: null,
    primary_metric_id: 999,
    primary_metric: { name: 'Other' }, // different metric — no fetch
  },
];

const snapshotFor = (impact: number) => ({
  columnNames: ['metric_id', 'variant', 'percent_change'],
  rows: [
    [100, 0, 0],
    [100, 1, impact],
  ],
});

describe('summarizeRelatedExperiments', () => {
  it('only fetches snapshots for related experiments that share primary metric', async () => {
    const client = {
      getExperimentMetricsCached: vi.fn(async (id: number) => snapshotFor(id === 2 ? 4 : 8)),
    };
    const reg = new SourceSignalRegistry();
    const out = await summarizeRelatedExperiments(client as any, focal as any, related as any, reg);

    expect(client.getExperimentMetricsCached).toHaveBeenCalledTimes(2);
    expect(client.getExperimentMetricsCached).toHaveBeenCalledWith(2);
    expect(client.getExperimentMetricsCached).toHaveBeenCalledWith(3);

    const r2 = out.items.find((r) => r.id === 2)!;
    expect(r2.leading_variant_impact_percent).toBe(4);
    const r4 = out.items.find((r) => r.id === 4)!;
    expect(r4.leading_variant_impact_percent).toBeNull();

    expect(out.benchmark).toEqual({ observed_impacts: [4, 8], median_abs_impact: 6 });
  });

  it('skips the focal experiment', async () => {
    const client = { getExperimentMetricsCached: vi.fn() };
    const reg = new SourceSignalRegistry();
    const out = await summarizeRelatedExperiments(
      client as any,
      focal as any,
      [{ id: 1, name: 'self', primary_metric_id: 100 }, ...related] as any,
      reg
    );
    expect(out.items.find((r) => r.id === 1)).toBeUndefined();
  });

  it('caps at 24 items', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: i + 100,
      name: `e${i}`,
      state: 'running',
      primary_metric_id: 999,
    }));
    const client = { getExperimentMetricsCached: vi.fn() };
    const reg = new SourceSignalRegistry();
    const out = await summarizeRelatedExperiments(client as any, focal as any, many as any, reg);
    expect(out.items).toHaveLength(24);
  });

  it('records failures via registry and emits null impact for that related experiment', async () => {
    const client = {
      getExperimentMetricsCached: vi.fn(async (id: number) => {
        if (id === 3) throw new Error('boom');
        return snapshotFor(5);
      }),
    };
    const reg = new SourceSignalRegistry();
    const out = await summarizeRelatedExperiments(client as any, focal as any, related as any, reg);

    const r3 = out.items.find((r) => r.id === 3)!;
    expect(r3.leading_variant_impact_percent).toBeNull();
    expect(out.benchmark?.observed_impacts).toEqual([5]);
    expect(
      reg.toArray().some((e) => e.covers === 'related_experiments[3]' && /error/.test(e.source))
    ).toBe(true);
  });

  it('returns benchmark=null when fewer than 2 numeric impacts collected', async () => {
    const client = { getExperimentMetricsCached: vi.fn(async () => snapshotFor(7)) };
    const reg = new SourceSignalRegistry();
    const justOne = [related[0]];
    const out = await summarizeRelatedExperiments(client as any, focal as any, justOne as any, reg);
    expect(out.benchmark).toBeNull();
  });
});
