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

  it('should generate types with experiment names and variants', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([
      { name: 'exp_one', variants: [{ name: 'control' }, { name: 'treatment' }] },
      { name: 'exp_two', variants: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
    ]);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain("'exp_one'");
    expect(output).toContain("'exp_two'");
    expect(output).toContain("'control' | 'treatment'");
    expect(output).toContain("'A' | 'B' | 'C'");
    expect(output).toContain('export type ExperimentName');
    expect(output).toContain('treatment(experimentName: ExperimentName): number');
  });

  it('should write to file with --output', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([
      { name: 'file_exp', variants: [{ name: 'control' }] },
    ]);

    await generateCommand.parseAsync(['node', 'test', 'types', '--output', 'types.ts']);

    expect(writeFileSync).toHaveBeenCalledWith(
      'types.ts',
      expect.stringContaining("'file_exp'"),
      'utf8'
    );
  });

  it('should handle pagination across multiple pages', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ name: `exp_${i}`, variants: [] }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ name: `exp_${100 + i}`, variants: [] }));

    mockClient.listExperiments
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    expect(mockClient.listExperiments).toHaveBeenCalledTimes(2);
    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain("'exp_0'");
    expect(output).toContain("'exp_149'");
  });

  it('should handle empty experiment list', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([]);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('export type ExperimentName');
  });

  it('should escape backslashes and quotes in names', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([
      { name: "User's\\Test", variants: [] },
    ]);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain("User\\'s\\\\Test");
  });
});
