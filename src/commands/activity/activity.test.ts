import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { activityFeedCommand, formatNoteText } from './index.js';
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
      expect.objectContaining({ sort: 'updated_at', items: 20 })
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

describe('formatNoteText', () => {
  it('should extract link text from markdown links', () => {
    expect(formatNoteText('[events.zip](/v1/experiments/exports/123/events.zip "title")')).toBe('events.zip');
  });

  it('should replace user references', () => {
    expect(formatNoteText('"Can view" permission was granted to [@user_id:50].')).toBe('"Can view" permission was granted to user:50.');
  });

  it('should replace team references', () => {
    expect(formatNoteText('"Can edit" permission was removed from [@team_id:76].')).toBe('"Can edit" permission was removed from team:76.');
  });

  it('should replace markdown images with placeholder', () => {
    expect(formatNoteText('Check this ![screenshot](https://example.com/img.png)')).toBe('Check this [image: screenshot]');
  });

  it('should replace HTML img tags', () => {
    expect(formatNoteText('See <img src="x.png" alt="result">')).toBe('See [image: result]');
  });

  it('should replace HTML img without alt', () => {
    expect(formatNoteText('See <img src="x.png">')).toBe('See [image]');
  });

  it('should replace HTML links with text and URL', () => {
    expect(formatNoteText('Visit <a href="https://example.com">Example</a>')).toBe('Visit Example (https://example.com)');
  });

  it('should strip remaining HTML tags', () => {
    expect(formatNoteText('Hello <strong>world</strong> <em>test</em>')).toBe('Hello world test');
  });

  it('should strip markdown bold and italic', () => {
    expect(formatNoteText('This is **bold** and *italic*')).toBe('This is bold and italic');
  });

  it('should strip markdown inline code', () => {
    expect(formatNoteText('Run `npm install`')).toBe('Run npm install');
  });

  it('should pass through plain text unchanged', () => {
    expect(formatNoteText('Added new experiment screenshots')).toBe('Added new experiment screenshots');
  });

  it('should handle complex real-world note', () => {
    const note = 'The experiment data is ready to be downloaded  [events_3939.zip](/v1/experiments/exports/3939/events_3939.zip "/v1/experiments/exports/3939/events_3939.zip"). Download file is valid for 30 days.';
    const result = formatNoteText(note);
    expect(result).toContain('events_3939.zip');
    expect(result).not.toContain('/v1/experiments');
    expect(result).toContain('30 days');
  });
});
