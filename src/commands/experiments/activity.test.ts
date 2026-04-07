import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { activityCommand } from './activity.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('activity command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    resolveExperimentId: vi.fn().mockImplementation((v: string) => {
      const n = Number(v);
      return Promise.resolve(isNaN(n) ? 123 : n);
    }),
    listExperimentActivity: vi.fn(),
    createExperimentNote: vi.fn().mockResolvedValue({ id: 1 }),
    editExperimentNote: vi.fn().mockResolvedValue({ id: 1 }),
    replyToExperimentNote: vi.fn().mockResolvedValue({ id: 2 }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(activityCommand);
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

  it('should list activity with formatted output', async () => {
    mockClient.listExperimentActivity.mockResolvedValue([
      { id: 1, created_at: '2026-03-22T14:30:00Z', action: 'start', created_by: { first_name: 'Alice', last_name: 'Smith' } },
    ]);

    await activityCommand.parseAsync(['node', 'test', 'list', '42']);

    expect(mockClient.resolveExperimentId).toHaveBeenCalledWith('42');
    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(42);
    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Alice Smith');
    expect(output).toContain('start');
  });

  it('should show message when no activity found', async () => {
    mockClient.listExperimentActivity.mockResolvedValue([]);

    await activityCommand.parseAsync(['node', 'test', 'list', '42']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('No activity found');
  });

  it('should create an activity note', async () => {
    await activityCommand.parseAsync(['node', 'test', 'create', '42', '--note', 'test note']);

    expect(mockClient.createExperimentNote).toHaveBeenCalledWith(42, 'test note');
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Note created');
  });

  it('should edit an activity note', async () => {
    await activityCommand.parseAsync(['node', 'test', 'edit', '42', '1', '--note', 'updated']);

    expect(mockClient.editExperimentNote).toHaveBeenCalledWith(42, 1, 'updated');
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('updated');
  });

  it('should reply to an activity note', async () => {
    await activityCommand.parseAsync(['node', 'test', 'reply', '42', '1', '--note', 'reply text']);

    expect(mockClient.replyToExperimentNote).toHaveBeenCalledWith(42, 1, 'reply text');
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Reply created');
  });

  it('should resolve experiment name to ID', async () => {
    mockClient.listExperimentActivity.mockResolvedValue([]);

    await activityCommand.parseAsync(['node', 'test', 'list', 'my_experiment']);

    expect(mockClient.resolveExperimentId).toHaveBeenCalledWith('my_experiment');
  });
});
