import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { envsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('envs command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listEnvironments: vi.fn().mockResolvedValue([{ id: 1, name: 'production' }]),
    getEnvironment: vi.fn().mockResolvedValue({ id: 1, name: 'production' }),
    createEnvironment: vi.fn().mockResolvedValue({ id: 2, name: 'staging' }),
    updateEnvironment: vi.fn().mockResolvedValue({ id: 1, name: 'updated' }),
    archiveEnvironment: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(envsCommand);
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

  it('should list environments', async () => {
    await envsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listEnvironments).toHaveBeenCalled();
    expect(printFormatted).toHaveBeenCalledWith(
      [{ id: 1, name: 'production' }],
      expect.anything()
    );
  });

  it('should get environment by id', async () => {
    await envsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getEnvironment).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });

  it('should create environment', async () => {
    await envsCommand.parseAsync(['node', 'test', 'create', '--name', 'staging']);
    expect(mockClient.createEnvironment).toHaveBeenCalledWith({ name: 'staging' });
  });

  it('should update environment', async () => {
    await envsCommand.parseAsync(['node', 'test', 'update', '1', '--name', 'updated']);
    expect(mockClient.updateEnvironment).toHaveBeenCalledWith(1, { name: 'updated' });
  });

  it('should archive environment', async () => {
    await envsCommand.parseAsync(['node', 'test', 'archive', '1']);
    expect(mockClient.archiveEnvironment).toHaveBeenCalledWith(1, undefined);
  });

  it('should unarchive environment', async () => {
    await envsCommand.parseAsync(['node', 'test', 'archive', '1', '--unarchive']);
    expect(mockClient.archiveEnvironment).toHaveBeenCalledWith(1, true);
  });
});
