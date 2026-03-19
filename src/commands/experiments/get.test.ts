import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCommand } from './get.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('get command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    getExperiment: vi.fn().mockResolvedValue({ id: 42, name: 'test-exp' }),
    listExperimentActivity: vi.fn().mockResolvedValue([{ id: 1, text: 'note' }]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(getCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    vi.mocked(printFormatted).mockImplementation(() => {});
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

  it('should get experiment by ID', async () => {
    await getCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.getExperiment).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      expect.anything()
    );
  });

  it('should include activity with --activity flag', async () => {
    await getCommand.parseAsync(['node', 'test', '42', '--activity']);

    expect(mockClient.getExperiment).toHaveBeenCalledWith(42);
    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, activity: [{ id: 1, text: 'note' }] }),
      expect.anything()
    );
  });

  it('should not fetch activity without --activity flag', async () => {
    await getCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.listExperimentActivity).not.toHaveBeenCalled();
  });

  it('should output markdown template with --output template', async () => {
    mockClient.getExperiment.mockResolvedValue({
      id: 42,
      name: 'test-exp',
      display_name: 'Test Exp',
      type: 'test',
      state: 'running',
      variants: [
        { name: 'control', variant: 0, config: '{}' },
        { name: 'treatment', variant: 1, config: '{}' },
      ],
    });
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'template' } as any);

    await getCommand.parseAsync(['node', 'test', '42']);

    expect(printFormatted).not.toHaveBeenCalled();
    const output = consoleSpy.mock.calls.flat().join('');
    expect(output).toContain('---');
    expect(output).toContain('name: test-exp');
    expect(output).toContain('display_name: Test Exp');
    expect(output).toContain('### variant_0');
    expect(output).toContain('### variant_1');
  });
});
