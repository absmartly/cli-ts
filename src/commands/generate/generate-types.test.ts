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

  it('should generate types to stdout', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([
      { name: 'homepage_test' },
      { name: 'checkout_flow' },
    ]);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('ExperimentName');
    expect(output).toContain('homepage_test');
    expect(output).toContain('checkout_flow');
  });

  it('should write to file with --output', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([
      { name: 'homepage_test' },
      { name: 'checkout_flow' },
    ]);

    await generateCommand.parseAsync(['node', 'test', 'types', '-o', '/tmp/types.ts']);

    expect(writeFileSync).toHaveBeenCalledWith(
      '/tmp/types.ts',
      expect.stringContaining('ExperimentName'),
      'utf8'
    );
  });

  it('should deduplicate names', async () => {
    mockClient.listExperiments.mockResolvedValueOnce([
      { name: 'dup' },
      { name: 'dup' },
      { name: 'unique' },
    ]);

    await generateCommand.parseAsync(['node', 'test', 'types']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    const dupMatches = output.match(/'dup'/g);
    expect(dupMatches).toHaveLength(1);
    expect(output).toContain('unique');
  });
});
