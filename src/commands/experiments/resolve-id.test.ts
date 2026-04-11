import { describe, it, expect, vi } from 'vitest';
import { parseExperimentIdOrName, resolveExperimentArg } from './resolve-id.js';

describe('parseExperimentIdOrName', () => {
  it('should return trimmed string', () => {
    expect(parseExperimentIdOrName('  my-experiment  ')).toBe('my-experiment');
  });

  it('should throw on empty string', () => {
    expect(() => parseExperimentIdOrName('')).toThrow('Experiment ID or name is required');
  });

  it('should throw on whitespace-only string', () => {
    expect(() => parseExperimentIdOrName('   ')).toThrow('Experiment ID or name is required');
  });
});

describe('resolveExperimentArg', () => {
  it('should delegate to client.resolveExperimentId', async () => {
    const mockClient = {
      resolveExperimentId: vi.fn().mockResolvedValue(42),
    };

    const result = await resolveExperimentArg(mockClient as any, 'my-experiment');

    expect(mockClient.resolveExperimentId).toHaveBeenCalledWith('my-experiment');
    expect(result).toBe(42);
  });
});
