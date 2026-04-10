import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { alertsCommand } from './alerts.js';
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

describe('alerts command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listExperimentAlerts: vi.fn(),
    dismissAlert: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(alertsCommand);
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

  it('should list alerts and print formatted results', async () => {
    const mockAlerts = [{ id: 1, type: 'srm', experiment_id: 42 }];
    mockClient.listExperimentAlerts.mockResolvedValue(mockAlerts);

    await alertsCommand.parseAsync(['node', 'test', 'list', '42']);

    expect(mockClient.listExperimentAlerts).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalledWith(mockAlerts, expect.anything());
  });

  it('should show message when no alerts found', async () => {
    mockClient.listExperimentAlerts.mockResolvedValue([]);

    await alertsCommand.parseAsync(['node', 'test', 'list', '42']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('No alerts found');
    expect(printFormatted).not.toHaveBeenCalled();
  });

  it('should dismiss an alert', async () => {
    mockClient.dismissAlert.mockResolvedValue(undefined);

    await alertsCommand.parseAsync(['node', 'test', 'dismiss', '5']);

    expect(mockClient.dismissAlert).toHaveBeenCalledWith(5);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('5');
    expect(output).toContain('dismissed');
  });
});
