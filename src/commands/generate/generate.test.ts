import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { writeFileSync } from 'fs';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, writeFileSync: vi.fn() };
});

describe('generate types command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listExperiments: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(generateCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should generate TypeScript types from experiments', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([
      { name: 'exp_one' },
      { name: 'exp_two' },
    ]);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain("| 'exp_one'");
    expect(output).toContain("| 'exp_two'");
    expect(output).toContain('export type ExperimentName');
  });

  it('should write to file with --output', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([{ name: 'file_exp' }]);

    await generateCommand.parseAsync(['node', 'test', 'types', '--output', 'types.ts']);

    expect(writeFileSync).toHaveBeenCalledWith(
      'types.ts',
      expect.stringContaining("| 'file_exp'"),
      'utf8'
    );
  });

  it('should handle pagination across multiple pages', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ name: `exp_${i}` }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ name: `exp_${100 + i}` }));

    mockClient.listExperiments
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    expect(mockClient.listExperiments).toHaveBeenCalledTimes(2);
    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain("| 'exp_0'");
    expect(output).toContain("| 'exp_149'");
  });

  it('should handle empty experiment list', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([]);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('export type ExperimentName');
  });

  it('should escape backslashes and quotes in names', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([
      { name: "User's\\Test" },
    ]);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain("User\\'s\\\\Test");
  });

  it('should error on invalid API response', async () => {
    mockClient.listExperiments.mockResolvedValueOnce('not-an-array');

    try {
      await generateCommand.parseAsync(['node', 'test', 'types']);
      throw new Error('Should have thrown');
    } catch (error) {
      if ((error as Error).message.startsWith('process.exit')) {
        const output = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(output).toContain('Invalid API response');
        expect(output).toContain('Expected array');
      } else {
        throw error;
      }
    }
  });
});
