import { describe, it, expect, vi } from 'vitest';
import { resolveNote } from './resolve-note.js';
import * as cache from '../../lib/config/action-dialog-cache.js';

vi.mock('../../lib/config/action-dialog-cache.js', () => ({
  getActionDialogField: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

describe('resolveNote', () => {
  it('should return --note when provided', async () => {
    const result = await resolveNote({ note: 'my note' }, 'stop', 'test');
    expect(result).toBe('my note');
  });

  it('should return undefined when no note and no cache', async () => {
    vi.mocked(cache.getActionDialogField).mockReturnValue(undefined);
    const result = await resolveNote({}, 'stop', 'test');
    expect(result).toBeUndefined();
  });

  it('should return default_value from cache when no --note', async () => {
    vi.mocked(cache.getActionDialogField).mockReturnValue({
      id: 1, type: 'test', subtitle: 'Comment', description: null,
      placeholder: null, default_value: 'Stopped from dashboard', required: false,
      action_type: 'stop', order_index: 0,
    });
    const result = await resolveNote({}, 'stop', 'test');
    expect(result).toBe('Stopped from dashboard');
  });

  it('should throw when required and no --note provided', async () => {
    vi.mocked(cache.getActionDialogField).mockReturnValue({
      id: 1, type: 'test', subtitle: 'Comment', description: null,
      placeholder: null, default_value: null, required: true,
      action_type: 'stop', order_index: 0,
    });
    await expect(resolveNote({}, 'stop', 'test')).rejects.toThrow('--note is required');
  });

  it('should not throw when required but --note provided', async () => {
    vi.mocked(cache.getActionDialogField).mockReturnValue({
      id: 1, type: 'test', subtitle: 'Comment', description: null,
      placeholder: null, default_value: null, required: true,
      action_type: 'stop', order_index: 0,
    });
    const result = await resolveNote({ note: 'provided' }, 'stop', 'test');
    expect(result).toBe('provided');
  });

  it('should prompt interactively when -i flag set', async () => {
    const { input } = await import('@inquirer/prompts');
    vi.mocked(input).mockResolvedValue('interactive note');
    vi.mocked(cache.getActionDialogField).mockReturnValue(undefined);

    const result = await resolveNote({ interactive: true }, 'stop', 'test');
    expect(result).toBe('interactive note');
    expect(input).toHaveBeenCalled();
  });

  it('should use description from cache as prompt message', async () => {
    const { input } = await import('@inquirer/prompts');
    vi.mocked(input).mockResolvedValue('my note');
    vi.mocked(cache.getActionDialogField).mockReturnValue({
      id: 1, type: 'test', subtitle: 'Comment', description: 'Why are you stopping?',
      placeholder: null, default_value: 'default text', required: true,
      action_type: 'stop', order_index: 0,
    });

    await resolveNote({ interactive: true }, 'stop', 'test');
    expect(input).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Why are you stopping?',
      default: 'default text',
    }));
  });
});
