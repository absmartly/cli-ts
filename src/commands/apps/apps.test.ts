import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { appsCommand } from './index.js';
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

describe('apps command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listApplications: vi.fn().mockResolvedValue([{ id: 1, name: 'web' }]),
    getApplication: vi.fn().mockResolvedValue({ id: 1, name: 'web' }),
    createApplication: vi.fn().mockResolvedValue({ id: 3, name: 'new-app' }),
    updateApplication: vi.fn().mockResolvedValue({ id: 1, name: 'updated' }),
    archiveApplication: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(appsCommand);
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

  it('should list applications', async () => {
    await appsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listApplications).toHaveBeenCalled();
    expect(printFormatted).toHaveBeenCalledWith([{ id: 1, name: 'web' }], expect.anything());
  });

  it('should get application by id', async () => {
    await appsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getApplication).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });

  it('should reject invalid id', async () => {
    await expect(appsCommand.parseAsync(['node', 'test', 'get', 'abc'])).rejects.toThrow(
      'is not a valid number'
    );
  });

  it('should create application', async () => {
    await appsCommand.parseAsync(['node', 'test', 'create', '--name', 'new-app']);
    expect(mockClient.createApplication).toHaveBeenCalledWith({ name: 'new-app' });
  });

  it('should update application', async () => {
    await appsCommand.parseAsync(['node', 'test', 'update', '1', '--name', 'updated']);
    expect(mockClient.updateApplication).toHaveBeenCalledWith(1, { name: 'updated' });
  });

  it('should archive application', async () => {
    await appsCommand.parseAsync(['node', 'test', 'archive', '1']);
    expect(mockClient.archiveApplication).toHaveBeenCalledWith(1, undefined);
  });

  it('should unarchive application', async () => {
    await appsCommand.parseAsync(['node', 'test', 'archive', '1', '--unarchive']);
    expect(mockClient.archiveApplication).toHaveBeenCalledWith(1, true);
  });
});
