import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { customFieldsCommand } from './index.js';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
} from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return {
    ...actual,
    getAPIClientFromOptions: vi.fn(),
    getGlobalOptions: vi.fn(),
    printFormatted: vi.fn(),
  };
});

describe('custom fields command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listCustomSectionFields: vi.fn(),
    getCustomSectionField: vi.fn(),
    createCustomSectionField: vi.fn(),
    updateCustomSectionField: vi.fn(),
    archiveCustomSectionField: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(customFieldsCommand);
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

  it('should list custom section fields', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([{ id: 1, name: 'field1' }]);
    await customFieldsCommand.parseAsync(['node', 'test', 'list']);
    expect(mockClient.listCustomSectionFields).toHaveBeenCalledWith(100, 1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list with --items and --page', async () => {
    mockClient.listCustomSectionFields.mockResolvedValue([]);
    await customFieldsCommand.parseAsync(['node', 'test', 'list', '--items', '10', '--page', '5']);
    expect(mockClient.listCustomSectionFields).toHaveBeenCalled();
  });

  it('should get a custom section field', async () => {
    mockClient.getCustomSectionField.mockResolvedValue({ id: 1, name: 'field1' });
    await customFieldsCommand.parseAsync(['node', 'test', 'get', '1']);
    expect(mockClient.getCustomSectionField).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should create a custom section field', async () => {
    mockClient.createCustomSectionField.mockResolvedValue({
      id: 1,
      name: 'field1',
      type: 'string',
    });
    await customFieldsCommand.parseAsync([
      'node',
      'test',
      'create',
      '--name',
      'field1',
      '--type',
      'string',
    ]);
    expect(mockClient.createCustomSectionField).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'field1', type: 'string' })
    );
  });

  it('should create with --default-value', async () => {
    mockClient.createCustomSectionField.mockResolvedValue({ id: 1, name: 'f', type: 'string' });
    await customFieldsCommand.parseAsync([
      'node',
      'test',
      'create',
      '--name',
      'f',
      '--type',
      'string',
      '--default-value',
      'hello',
    ]);
    expect(mockClient.createCustomSectionField).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'f', type: 'string', default_value: 'hello' })
    );
  });

  it('should update a custom section field', async () => {
    mockClient.updateCustomSectionField.mockResolvedValue({ id: 1, name: 'updated' });
    await customFieldsCommand.parseAsync(['node', 'test', 'update', '1', '--name', 'updated']);
    expect(mockClient.updateCustomSectionField).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'updated' })
    );
  });

  it('should update with --type and --default-value', async () => {
    mockClient.updateCustomSectionField.mockResolvedValue({ id: 1 });
    await customFieldsCommand.parseAsync([
      'node',
      'test',
      'update',
      '1',
      '--type',
      'number',
      '--default-value',
      '42',
    ]);
    expect(mockClient.updateCustomSectionField).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'number', default_value: '42' })
    );
  });

  it('should archive a custom section field', async () => {
    mockClient.archiveCustomSectionField.mockResolvedValue(undefined);
    await customFieldsCommand.parseAsync(['node', 'test', 'archive', '1']);
    expect(mockClient.archiveCustomSectionField).toHaveBeenCalledWith(1, false);
  });

  it('should unarchive with --unarchive flag', async () => {
    mockClient.archiveCustomSectionField.mockResolvedValue(undefined);
    await customFieldsCommand.parseAsync(['node', 'test', 'archive', '1', '--unarchive']);
    expect(mockClient.archiveCustomSectionField).toHaveBeenCalledWith(1, true);
  });

  it('should reject invalid ID for get', async () => {
    await expect(customFieldsCommand.parseAsync(['node', 'test', 'get', 'abc'])).rejects.toThrow();
  });
});
