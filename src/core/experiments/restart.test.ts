import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRestartParams, restartExperiment, VALID_RESTART_REASONS, VALID_RESTART_TYPES } from './restart.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

vi.mock('../../lib/template/parser.js', () => ({
  parseExperimentFile: vi.fn().mockReturnValue({ name: 'from-file' }),
}));

vi.mock('../../api-client/template/build-from-template.js', () => ({
  buildPayloadFromTemplate: vi.fn().mockResolvedValue({ payload: {}, warnings: [] }),
}));

vi.mock('./resolve-custom-fields.js', () => ({
  resolveCustomFieldValues: vi.fn().mockResolvedValue({}),
}));

const id = (n: number) => n as ExperimentId;

describe('restart', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      restartExperiment: vi.fn().mockResolvedValue({ id: 200 }),
    };
  });

  describe('validateRestartParams', () => {
    const baseParams = { experimentId: id(1), defaultType: 'experiment' };

    it('accepts valid params with no optional fields', () => {
      expect(() => validateRestartParams(baseParams)).not.toThrow();
    });

    it('throws for invalid reason', () => {
      expect(() =>
        validateRestartParams({ ...baseParams, reason: 'invalid' }),
      ).toThrow('Invalid reason: "invalid"');
    });

    it('includes valid reasons in error message', () => {
      expect(() =>
        validateRestartParams({ ...baseParams, reason: 'invalid' }),
      ).toThrow('Valid reasons:');
    });

    it('accepts all valid reasons', () => {
      for (const reason of VALID_RESTART_REASONS) {
        expect(() => validateRestartParams({ ...baseParams, reason })).not.toThrow();
      }
    });

    it('throws for invalid state', () => {
      expect(() =>
        validateRestartParams({ ...baseParams, state: 'stopped' }),
      ).toThrow('Invalid state: "stopped"');
    });

    it('accepts running state', () => {
      expect(() => validateRestartParams({ ...baseParams, state: 'running' })).not.toThrow();
    });

    it('accepts development state', () => {
      expect(() => validateRestartParams({ ...baseParams, state: 'development' })).not.toThrow();
    });

    it('throws for invalid asType', () => {
      expect(() =>
        validateRestartParams({ ...baseParams, asType: 'invalid' }),
      ).toThrow('Invalid type: "invalid"');
    });

    it('accepts all valid types', () => {
      for (const t of VALID_RESTART_TYPES) {
        expect(() => validateRestartParams({ ...baseParams, asType: t })).not.toThrow();
      }
    });
  });

  describe('restartExperiment', () => {
    it('calls client with default note', async () => {
      const result = await restartExperiment(mockClient as any, {
        experimentId: id(1),
        defaultType: 'experiment',
      });
      expect(mockClient.restartExperiment).toHaveBeenCalledWith(id(1), { note: 'Restarted via CLI' });
      expect(result.data).toEqual({ id: id(1), newId: 200 });
    });

    it('passes reason and reshuffle options', async () => {
      await restartExperiment(mockClient as any, {
        experimentId: id(1),
        defaultType: 'experiment',
        reason: 'testing',
        reshuffle: true,
        note: 'custom',
      });
      expect(mockClient.restartExperiment).toHaveBeenCalledWith(id(1), expect.objectContaining({
        note: 'custom',
        reason: 'testing',
        reshuffle: true,
      }));
    });

    it('passes changes when provided', async () => {
      const changes = { name: 'restarted' };
      await restartExperiment(mockClient as any, {
        experimentId: id(1),
        defaultType: 'experiment',
      }, changes as any);
      expect(mockClient.restartExperiment).toHaveBeenCalledWith(id(1), expect.objectContaining({
        changes: { name: 'restarted' },
      }));
    });

    it('throws on invalid reason during restart', async () => {
      await expect(
        restartExperiment(mockClient as any, {
          experimentId: id(1),
          defaultType: 'experiment',
          reason: 'bad',
        }),
      ).rejects.toThrow('Invalid reason');
    });
  });
});
