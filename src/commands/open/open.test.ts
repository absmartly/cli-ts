import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import open from 'open';
import { openCommand } from './index.js';

const { fakeHome } = vi.hoisted(() => {
  const { mkdtempSync } = require('fs');
  const { join } = require('path');
  const { tmpdir } = require('os');
  return { fakeHome: mkdtempSync(join(tmpdir(), 'abs-open-test-')) as string };
});

vi.mock('os', async (importOriginal) => {
  const mod = await importOriginal<typeof import('os')>();
  return { ...mod, homedir: () => fakeHome };
});

import { saveConfig, defaultConfig } from '../../lib/config/config.js';

vi.mock('open');

describe('Open Command Validation', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const config = defaultConfig();
    config.profiles.default.api.endpoint = 'https://api.absmartly.com/v1';
    saveConfig(config);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit: ${code}`);
    });
    vi.mocked(open).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('resource type validation', () => {
    it('should accept valid resource type: experiments', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiments']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiments');
    });

    it('should accept valid resource type: experiment', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiment']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiment');
    });

    it('should accept valid resource type: metrics', async () => {
      await openCommand.parseAsync(['node', 'test', 'metrics']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/metrics');
    });

    it('should accept valid resource type: metric', async () => {
      await openCommand.parseAsync(['node', 'test', 'metric']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/metric');
    });

    it('should accept valid resource type: goals', async () => {
      await openCommand.parseAsync(['node', 'test', 'goals']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/goals');
    });

    it('should accept valid resource type: goal', async () => {
      await openCommand.parseAsync(['node', 'test', 'goal']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/goal');
    });

    it('should accept valid resource type: teams', async () => {
      await openCommand.parseAsync(['node', 'test', 'teams']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/teams');
    });

    it('should accept valid resource type: team', async () => {
      await openCommand.parseAsync(['node', 'test', 'team']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/team');
    });

    it('should accept valid resource type: users', async () => {
      await openCommand.parseAsync(['node', 'test', 'users']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/users');
    });

    it('should accept valid resource type: user', async () => {
      await openCommand.parseAsync(['node', 'test', 'user']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/user');
    });

    it('should accept valid resource type: segments', async () => {
      await openCommand.parseAsync(['node', 'test', 'segments']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/segments');
    });

    it('should accept valid resource type: segment', async () => {
      await openCommand.parseAsync(['node', 'test', 'segment']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/segment');
    });

    it('should reject invalid resource type', async () => {
      try {
        await openCommand.parseAsync(['node', 'test', 'invalid']);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(errorCalls).toContain('Invalid resource type: "invalid"');
          expect(errorCalls).toContain('Valid types:');
          expect(errorCalls).toContain('experiments');
        } else {
          throw error;
        }
      }
    });

    it('should list all valid resource types in error message', async () => {
      try {
        await openCommand.parseAsync(['node', 'test', 'bad-resource']);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(errorCalls).toContain('Valid types:');
          expect(errorCalls).toContain('experiments');
          expect(errorCalls).toContain('metrics');
          expect(errorCalls).toContain('goals');
          expect(errorCalls).toContain('teams');
          expect(errorCalls).toContain('users');
          expect(errorCalls).toContain('segments');
        } else {
          throw error;
        }
      }
    });
  });

  describe('ID validation', () => {
    it('should accept valid positive integer ID', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiments', '42']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiments/42');
    });

    it('should accept large ID', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiments', '999999']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiments/999999');
    });

    it('should reject non-numeric ID', async () => {
      try {
        await openCommand.parseAsync(['node', 'test', 'experiments', 'abc']);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(errorCalls).toContain('Error:');
          expect(errorCalls).toContain('Invalid resource ID: "abc" - must be a positive integer');
        } else {
          throw error;
        }
      }
    });

    it('should reject negative ID', async () => {
      const { parseExperimentId } = await import('../../lib/utils/validators.js');
      expect(() => parseExperimentId('-5')).toThrow('must be a positive integer');
    });

    it('should reject zero ID', async () => {
      try {
        await openCommand.parseAsync(['node', 'test', 'experiments', '0']);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(errorCalls).toContain('Error:');
          expect(errorCalls).toContain('Invalid resource ID: "0" - must be a positive integer');
        } else {
          throw error;
        }
      }
    });

    it('should accept alphanumeric ID (parseInt behavior)', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiments', '123abc']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiments/123');
    });
  });

  describe('URL construction', () => {
    it('should construct correct URL for valid resource without ID', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiments']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiments');
    });

    it('should construct correct URL for valid resource with ID', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiments', '123']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiments/123');
    });

    it('should construct correct URL for metrics with ID', async () => {
      await openCommand.parseAsync(['node', 'test', 'metrics', '456']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/metrics/456');
    });

    it('should construct correct URL for teams without ID', async () => {
      await openCommand.parseAsync(['node', 'test', 'teams']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/teams');
    });

    it('should strip /v1 from endpoint', async () => {
      await openCommand.parseAsync(['node', 'test']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com');
    });
  });

  describe('edge cases', () => {
    it('should open dashboard root when no arguments', async () => {
      await openCommand.parseAsync(['node', 'test']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com');
    });

    it('should handle singular resource name', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiment', '1']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiment/1');
    });

    it('should handle plural resource name', async () => {
      await openCommand.parseAsync(['node', 'test', 'experiments', '1']);
      expect(open).toHaveBeenCalledWith('https://api.absmartly.com/experiments/1');
    });
  });
});
