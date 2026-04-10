import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { platformConfigCommand } from './index.js';
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

describe('platform-config command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listPlatformConfigs: vi.fn().mockResolvedValue([{ id: 1, value: 'test' }]),
    getPlatformConfig: vi.fn().mockResolvedValue({ id: 1, value: 'test' }),
    updatePlatformConfig: vi.fn().mockResolvedValue({ id: 1, value: 'new' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(platformConfigCommand);
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

  it('should list platform configs', async () => {
    await platformConfigCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listPlatformConfigs).toHaveBeenCalled();
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get platform config by id', async () => {
    await platformConfigCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getPlatformConfig).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should update platform config', async () => {
    await platformConfigCommand.parseAsync([
      'node',
      'test',
      'update',
      '1',
      '--value',
      '{"key":"val"}',
    ]);

    expect(mockClient.updatePlatformConfig).toHaveBeenCalledWith(1, { key: 'val' });
  });
});
