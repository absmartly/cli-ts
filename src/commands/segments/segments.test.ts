import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { segmentsCommand } from './index.js';
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

describe('segments command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listSegments: vi.fn().mockResolvedValue([{ id: 1, name: 'premium' }]),
    getSegment: vi.fn().mockResolvedValue({ id: 1, name: 'premium' }),
    createSegment: vi.fn().mockResolvedValue({ id: 99 }),
    updateSegment: vi.fn().mockResolvedValue({}),
    deleteSegment: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(segmentsCommand);
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

  it('should list segments', async () => {
    await segmentsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listSegments).toHaveBeenCalledWith(100, 1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get segment by id', async () => {
    await segmentsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getSegment).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });

  it('should create a segment', async () => {
    await segmentsCommand.parseAsync([
      'node',
      'test',
      'create',
      'my-seg',
      '--attribute',
      'user_id',
    ]);

    expect(mockClient.createSegment).toHaveBeenCalledWith({
      name: 'my-seg',
      value_source_attribute: 'user_id',
    });
  });

  it('should update a segment', async () => {
    await segmentsCommand.parseAsync(['node', 'test', 'update', '1', '--description', 'x']);

    expect(mockClient.updateSegment).toHaveBeenCalledWith(1, { description: 'x' });
  });

  it('should delete a segment', async () => {
    await segmentsCommand.parseAsync(['node', 'test', 'delete', '1']);

    expect(mockClient.deleteSegment).toHaveBeenCalledWith(1);
  });
});
