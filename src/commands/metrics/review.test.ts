import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metricsCommand } from './index.js';
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

describe('metrics review command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    getMetricReview: vi.fn(),
    requestMetricReview: vi.fn(),
    approveMetricReview: vi.fn(),
    listMetricReviewComments: vi.fn(),
    addMetricReviewComment: vi.fn(),
    replyToMetricReviewComment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(metricsCommand);
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

  it('should show metric review status', async () => {
    mockClient.getMetricReview.mockResolvedValue({ status: 'pending' });
    await metricsCommand.parseAsync(['node', 'test', 'review', 'status', '42']);
    expect(mockClient.getMetricReview).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should request metric review', async () => {
    mockClient.requestMetricReview.mockResolvedValue(undefined);
    await metricsCommand.parseAsync(['node', 'test', 'review', 'request', '42']);
    expect(mockClient.requestMetricReview).toHaveBeenCalledWith(42);
  });

  it('should approve metric review', async () => {
    mockClient.approveMetricReview.mockResolvedValue(undefined);
    await metricsCommand.parseAsync(['node', 'test', 'review', 'approve', '42']);
    expect(mockClient.approveMetricReview).toHaveBeenCalledWith(42);
  });

  it('should list metric review comments', async () => {
    mockClient.listMetricReviewComments.mockResolvedValue([{ id: 1, message: 'test' }]);
    await metricsCommand.parseAsync(['node', 'test', 'review', 'comments', '42']);
    expect(mockClient.listMetricReviewComments).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should add metric review comment', async () => {
    mockClient.addMetricReviewComment.mockResolvedValue(undefined);
    await metricsCommand.parseAsync([
      'node',
      'test',
      'review',
      'comment',
      '42',
      '--message',
      'looks good',
    ]);
    expect(mockClient.addMetricReviewComment).toHaveBeenCalledWith(42, 'looks good');
  });

  it('should reply to metric review comment', async () => {
    mockClient.replyToMetricReviewComment.mockResolvedValue(undefined);
    await metricsCommand.parseAsync([
      'node',
      'test',
      'review',
      'reply',
      '42',
      '5',
      '--message',
      'thanks',
    ]);
    expect(mockClient.replyToMetricReviewComment).toHaveBeenCalledWith(42, 5, 'thanks');
  });
});
