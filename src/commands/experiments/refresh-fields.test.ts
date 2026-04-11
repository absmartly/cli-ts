import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refreshFieldsCommand } from './refresh-fields.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { loadConfig } from '../../lib/config/config.js';
import { saveCachedFields } from '../../lib/config/custom-fields-cache.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});

vi.mock('../../lib/config/config.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../lib/config/custom-fields-cache.js', () => ({
  saveCachedFields: vi.fn(),
}));

vi.mock('../../lib/config/action-dialog-cache.js', () => ({
  saveCachedActionDialogFields: vi.fn(),
}));

describe('refresh-fields command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockFields = [
    {
      name: 'hypothesis',
      type: 'text',
      archived: false,
      custom_section: { type: 'test', archived: false },
    },
    {
      name: 'owner',
      type: 'select',
      archived: false,
      custom_section: { type: 'feature', archived: false },
    },
    {
      name: 'old-field',
      type: 'text',
      archived: true,
      custom_section: { type: 'test', archived: false },
    },
  ];

  const mockActionFields = [
    { id: 1, type: 'test', action_type: 'stop', required: true, default_value: null },
    { id: 2, type: 'test', action_type: 'start', required: false, default_value: null },
  ];

  const mockClient = {
    listCustomSectionFields: vi.fn().mockResolvedValue(mockFields),
    listExperimentActionDialogFields: vi.fn().mockResolvedValue(mockActionFields),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(refreshFieldsCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    vi.mocked(loadConfig).mockReturnValue({ 'default-profile': 'default' } as any);
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

  it('should fetch and cache custom fields', async () => {
    await refreshFieldsCommand.parseAsync(['node', 'test']);

    expect(mockClient.listCustomSectionFields).toHaveBeenCalled();
    expect(saveCachedFields).toHaveBeenCalledWith('default', 'test', mockFields);
    expect(saveCachedFields).toHaveBeenCalledWith('default', 'feature', mockFields);
  });

  it('should show field count in output', async () => {
    await refreshFieldsCommand.parseAsync(['node', 'test']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('2 custom fields');
  });
});
