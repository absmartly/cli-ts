import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webhooksCommand } from './index.js';
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

describe('webhooks command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listWebhooks: vi.fn().mockResolvedValue([{ id: 1, name: 'hook' }]),
    getWebhook: vi.fn().mockResolvedValue({ id: 1, name: 'hook' }),
    createWebhook: vi.fn().mockResolvedValue({ id: 99 }),
    updateWebhook: vi.fn().mockResolvedValue({}),
    deleteWebhook: vi.fn().mockResolvedValue({}),
    listWebhookEvents: vi
      .fn()
      .mockResolvedValue([{ id: 'experiment.started', name: 'Experiment Started' }]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(webhooksCommand);
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

  it('should list webhooks', async () => {
    await webhooksCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listWebhooks).toHaveBeenCalledWith(
      expect.objectContaining({ items: 20, page: 1 })
    );
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get webhook by id', async () => {
    await webhooksCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getWebhook).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });

  it('should create a webhook', async () => {
    await webhooksCommand.parseAsync([
      'node',
      'test',
      'create',
      '--name',
      'hook',
      '--url',
      'https://example.com',
    ]);

    expect(mockClient.createWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'hook',
        url: 'https://example.com',
      })
    );
  });

  it('should update a webhook', async () => {
    await webhooksCommand.parseAsync(['node', 'test', 'update', '1', '--name', 'new']);

    expect(mockClient.updateWebhook).toHaveBeenCalledWith(1, { name: 'new' });
  });

  it('should reject update with no fields', async () => {
    try {
      await webhooksCommand.parseAsync(['node', 'test', 'update', '1']);
      throw new Error('Should have thrown');
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('update field');
    }
  });

  it('should delete a webhook', async () => {
    await webhooksCommand.parseAsync(['node', 'test', 'delete', '1']);

    expect(mockClient.deleteWebhook).toHaveBeenCalledWith(1);
  });

  it('should list webhook events', async () => {
    await webhooksCommand.parseAsync(['node', 'test', 'events']);

    expect(mockClient.listWebhookEvents).toHaveBeenCalled();
    expect(printFormatted).toHaveBeenCalled();
  });
});
