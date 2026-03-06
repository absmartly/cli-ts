import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { unitsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('units command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listUnitTypes: vi.fn().mockResolvedValue([{ id: 1, name: 'user_id' }]),
    getUnitType: vi.fn().mockResolvedValue({ id: 1, name: 'user_id' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(unitsCommand);
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

  it('should list unit types', async () => {
    await unitsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listUnitTypes).toHaveBeenCalled();
    expect(printFormatted).toHaveBeenCalledWith(
      [{ id: 1, name: 'user_id' }],
      expect.anything()
    );
  });

  it('should get unit type by id', async () => {
    await unitsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getUnitType).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });
});
