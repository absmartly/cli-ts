import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { activityCommand } from './activity.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
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
    listExperimentActivity: vi.fn(),
    createExperimentNote: vi.fn(),
    editExperimentNote: vi.fn(),
    replyToExperimentNote: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(activityCommand);
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

  it('should list activity and print formatted results', async () => {
    mockClient.listExperimentActivity.mockResolvedValue([{ id: 1, text: 'started' }]);

    await activityCommand.parseAsync(['node', 'test', 'list', '42']);

    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should show message when no activity found', async () => {
    mockClient.listExperimentActivity.mockResolvedValue([]);

    await activityCommand.parseAsync(['node', 'test', 'list', '42']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('No activity found');
    expect(printFormatted).not.toHaveBeenCalled();
  });

  it('should create an activity note', async () => {
    const mockNote = { id: 1, note: 'test note' };
    mockClient.createExperimentNote.mockResolvedValue(mockNote);

    await activityCommand.parseAsync(['node', 'test', 'create', '42', '--note', 'test note']);

    expect(mockClient.createExperimentNote).toHaveBeenCalledWith(42, 'test note');
    expect(printFormatted).toHaveBeenCalledWith(mockNote, expect.anything());
  });

  it('should edit an activity note', async () => {
    const mockNote = { id: 5, note: 'edited note' };
    mockClient.editExperimentNote.mockResolvedValue(mockNote);

    await activityCommand.parseAsync(['node', 'test', 'edit', '42', '5', '--note', 'edited note']);

    expect(mockClient.editExperimentNote).toHaveBeenCalledWith(42, 5, 'edited note');
    expect(printFormatted).toHaveBeenCalledWith(mockNote, expect.anything());
  });

  it('should reply to an activity note', async () => {
    const mockNote = { id: 6, note: 'reply text' };
    mockClient.replyToExperimentNote.mockResolvedValue(mockNote);

    await activityCommand.parseAsync(['node', 'test', 'reply', '42', '5', '--note', 'reply text']);

    expect(mockClient.replyToExperimentNote).toHaveBeenCalledWith(42, 5, 'reply text');
    expect(printFormatted).toHaveBeenCalledWith(mockNote, expect.anything());
  });
});
