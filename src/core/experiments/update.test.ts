import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateExperiment, buildUpdateChanges } from './update.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

vi.mock('../../api-client/template/parser.js', () => ({
  parseExperimentMarkdown: vi.fn().mockReturnValue({ name: 'from-file' }),
}));

vi.mock('../../api-client/template/build-from-template.js', () => ({
  buildPayloadFromTemplate: vi.fn().mockResolvedValue({ payload: { name: 'built' }, warnings: ['warn'] }),
}));

vi.mock('../../api-client/payload/metrics-builder.js', () => ({
  buildSecondaryMetrics: vi.fn().mockReturnValue([{ metric_id: 10 }]),
}));

vi.mock('../../api-client/payload/parse-csv.js', () => ({
  parseCSV: vi.fn().mockImplementation((v?: string) => (v ? v.split(',').map((s: string) => s.trim()) : [])),
}));

vi.mock('../../api-client/payload/screenshot-parser.js', () => ({
  parseScreenshotEntries: vi.fn().mockResolvedValue([{ variant: 0, file: 'test.png' }]),
}));

vi.mock('./resolve-custom-fields.js', () => ({
  resolveCustomFieldValues: vi.fn().mockResolvedValue({ '1': { type: 'text', value: 'val' } }),
}));

const id = (n: number) => n as ExperimentId;

describe('update', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      updateExperiment: vi.fn().mockResolvedValue(undefined),
      resolveMetrics: vi.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
      resolveTeams: vi.fn().mockResolvedValue([{ id: 1 }]),
      resolveTags: vi.fn().mockResolvedValue([{ id: 5 }]),
      listCustomSectionFields: vi.fn().mockResolvedValue([]),
    };
  });

  describe('updateExperiment', () => {
    it('calls client.updateExperiment with changes', async () => {
      const result = await updateExperiment(mockClient as any, {
        experimentId: id(42),
        changes: { name: 'new-name' },
      });
      expect(mockClient.updateExperiment).toHaveBeenCalledWith(id(42), { name: 'new-name' }, undefined);
      expect(result.data).toEqual({ id: id(42) });
    });

    it('passes note as option when provided', async () => {
      await updateExperiment(mockClient as any, {
        experimentId: id(1),
        changes: { name: 'x' },
        note: 'updated',
      });
      expect(mockClient.updateExperiment).toHaveBeenCalledWith(id(1), { name: 'x' }, { note: 'updated' });
    });
  });

  describe('buildUpdateChanges', () => {
    const baseParams = { experimentId: id(1), defaultType: 'experiment' } as const;

    it('maps simple fields correctly', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        name: 'n',
        displayName: 'dn',
        state: 'running',
        percentageOfTraffic: 50,
        analysisType: 'bayesian',
        audience: 'all',
      });
      expect(changes.name).toBe('n');
      expect(changes.display_name).toBe('dn');
      expect(changes.state).toBe('running');
      expect(changes.percentage_of_traffic).toBe(50);
      expect(changes.analysis_type).toBe('bayesian');
      expect(changes.audience).toBe('all');
    });

    it('maps percentages to slash-separated format', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        percentages: '50, 50',
      });
      expect(changes.percentages).toBe('50/50');
    });

    it('maps primaryMetric to object', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        primaryMetric: 7,
      });
      expect(changes.primary_metric).toEqual({ metric_id: 7 });
    });

    it('maps unitType to object', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        unitType: 3,
      });
      expect(changes.unit_type).toEqual({ unit_type_id: 3 });
    });

    it('maps applicationId to array', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        applicationId: 9,
      });
      expect(changes.applications).toEqual([{ application_id: 9, application_version: '0' }]);
    });

    it('maps owners', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        owner: ['1', '2'],
      });
      expect(changes.owners).toEqual([{ user_id: 1 }, { user_id: 2 }]);
    });

    it('maps variants with configs', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        variants: 'control,treatment',
        variantConfig: ['{}', '{"key":true}'],
      });
      expect(changes.variants).toEqual([
        { name: 'control', variant: 0, config: '{}' },
        { name: 'treatment', variant: 1, config: '{"key":true}' },
      ]);
      expect(changes.nr_variants).toBe(2);
    });

    it('resolves teams', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        teams: 'team-a',
      });
      expect(changes.teams).toEqual([{ team_id: 1 }]);
    });

    it('resolves tags', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        tags: 'tag-a',
      });
      expect(changes.experiment_tags).toEqual([{ experiment_tag_id: 5 }]);
    });

    it('returns empty changes when no params provided', async () => {
      const { changes, warnings } = await buildUpdateChanges(mockClient as any, baseParams);
      expect(Object.keys(changes)).toHaveLength(0);
      expect(warnings).toHaveLength(0);
    });

    it('handles screenshot-id entries', async () => {
      const { changes } = await buildUpdateChanges(mockClient as any, {
        ...baseParams,
        screenshotId: ['0:123'],
      });
      expect(changes.variant_screenshots).toEqual([
        { variant: 0, screenshot_file_upload_id: 123 },
      ]);
    });

    it('throws on invalid screenshot-id format', async () => {
      await expect(
        buildUpdateChanges(mockClient as any, {
          ...baseParams,
          screenshotId: ['bad'],
        }),
      ).rejects.toThrow('Invalid --screenshot-id format');
    });
  });
});
