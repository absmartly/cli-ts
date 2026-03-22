import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { activityFeedCommand, formatNoteText, resolveMentions } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('activity-feed command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listExperiments: vi.fn(),
    listExperimentActivity: vi.fn(),
    listUsers: vi.fn().mockResolvedValue([{ id: 50, first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com' }]),
    listTeams: vi.fn().mockResolvedValue([{ id: 76, name: 'Engineering' }]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(activityFeedCommand);
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

  it('should fetch experiments and their activity', async () => {
    mockClient.listExperiments.mockResolvedValue([
      { id: 1, name: 'exp-one' },
      { id: 2, name: 'exp-two' },
    ]);

    mockClient.listExperimentActivity
      .mockResolvedValueOnce([
        { id: 10, created_at: '2026-03-22T14:30:00Z', action: 'start', note: 'Started', created_by: { first_name: 'Alice', last_name: 'Smith' } },
      ])
      .mockResolvedValueOnce([
        { id: 20, created_at: '2026-03-22T15:00:00Z', action: 'comment', note: 'Looks good', created_by: { first_name: 'Bob', last_name: 'Jones' } },
      ]);

    await activityFeedCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'updated_at', items: 50 })
    );
    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(1);
    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(2);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('exp-one');
    expect(output).toContain('exp-two');
    expect(output).toContain('Alice Smith');
    expect(output).toContain('Bob Jones');
  });

  it('should filter activity by --since flag', async () => {
    mockClient.listExperiments.mockResolvedValue([
      { id: 1, name: 'exp-one' },
    ]);

    mockClient.listExperimentActivity.mockResolvedValue([
      { id: 10, created_at: '2026-03-20T10:00:00Z', action: 'start', note: 'Old note', created_by: { first_name: 'Alice', last_name: 'Smith' } },
      { id: 11, created_at: '2026-03-22T14:30:00Z', action: 'comment', note: 'Recent note', created_by: { first_name: 'Bob', last_name: 'Jones' } },
    ]);

    await activityFeedCommand.parseAsync(['node', 'test', 'list', '--since', '2026-03-21', '--notes']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Recent note');
    expect(output).not.toContain('Old note');
  });

  it('should sort activity by created_at descending', async () => {
    mockClient.listExperiments.mockResolvedValue([
      { id: 1, name: 'exp-one' },
    ]);

    mockClient.listExperimentActivity.mockResolvedValue([
      { id: 10, created_at: '2026-03-20T10:00:00Z', action: 'start', note: null, created_by: { first_name: 'Alice', last_name: 'Smith' } },
      { id: 11, created_at: '2026-03-22T14:30:00Z', action: 'stop', note: null, created_by: { first_name: 'Bob', last_name: 'Jones' } },
      { id: 12, created_at: '2026-03-21T08:00:00Z', action: 'comment', note: 'Middle', created_by: { first_name: 'Charlie', last_name: 'Brown' } },
    ]);

    await activityFeedCommand.parseAsync(['node', 'test', 'list']);

    const calls = consoleSpy.mock.calls.flat();
    const actionLines = calls.filter((line: string) => line.includes('exp-one'));

    const stopIndex = actionLines.findIndex((line: string) => line.includes('stop'));
    const commentIndex = actionLines.findIndex((line: string) => line.includes('comment'));
    const startIndex = actionLines.findIndex((line: string) => line.includes('start'));

    expect(stopIndex).toBeLessThan(commentIndex);
    expect(commentIndex).toBeLessThan(startIndex);
  });

  it('should show no activity message when empty', async () => {
    mockClient.listExperiments.mockResolvedValue([]);

    await activityFeedCommand.parseAsync(['node', 'test', 'list']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('No activity found');
  });

  it('should pass state option to listExperiments', async () => {
    mockClient.listExperiments.mockResolvedValue([]);

    await activityFeedCommand.parseAsync(['node', 'test', 'list', '--state', 'running']);

    expect(mockClient.listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'running' })
    );
  });
});

describe('resolveMentions', () => {
  it('should resolve user mentions with lookup', () => {
    const lookups = { users: new Map([[50, 'Jonas Alves']]) };
    expect(resolveMentions('granted to [@user_id:50].', lookups)).toBe('granted to **@Jonas Alves**.');
  });

  it('should fall back to @user:id without lookup', () => {
    expect(resolveMentions('granted to [@user_id:50].')).toBe('granted to @user:50.');
  });

  it('should resolve team mentions with lookup', () => {
    const lookups = { teams: new Map([[76, 'Engineering']]) };
    expect(resolveMentions('removed from [@team_id:76].', lookups)).toBe('removed from **@Engineering**.');
  });

  it('should fall back to @team:id without lookup', () => {
    expect(resolveMentions('removed from [@team_id:76].')).toBe('removed from @team:76.');
  });
});

describe('formatNoteText', () => {
  it('should render markdown links as text', () => {
    const result = formatNoteText('[events.zip](/v1/exports/events.zip "title")');
    expect(result).toContain('events.zip');
  });

  it('should render bold text', () => {
    const result = formatNoteText('This is **bold** text');
    expect(result).toContain('bold');
  });

  it('should render inline code', () => {
    const result = formatNoteText('Run `npm install`');
    expect(result).toContain('npm install');
  });

  it('should pass through plain text', () => {
    const result = formatNoteText('Added new screenshots');
    expect(result).toContain('Added new screenshots');
  });

  it('should resolve mentions and render markdown', () => {
    const lookups = { users: new Map([[50, 'Jonas']]) };
    const result = formatNoteText('Granted to [@user_id:50].', lookups);
    expect(result).toContain('@Jonas');
  });

  it('should handle real-world download note', () => {
    const note = 'Download ready [events.zip](/v1/exports/events.zip). Valid for 30 days.';
    const result = formatNoteText(note);
    expect(result).toContain('events.zip');
    expect(result).toContain('30 days');
  });
});
