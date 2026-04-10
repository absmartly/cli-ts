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

describe('metrics access command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listMetricAccessUsers: vi.fn(),
    grantMetricAccessUser: vi.fn(),
    revokeMetricAccessUser: vi.fn(),
    listMetricAccessTeams: vi.fn(),
    grantMetricAccessTeam: vi.fn(),
    revokeMetricAccessTeam: vi.fn(),
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

  it('should list metric access users', async () => {
    mockClient.listMetricAccessUsers.mockResolvedValue([{ user_id: 1, asset_role_id: 2 }]);
    await metricsCommand.parseAsync(['node', 'test', 'access', 'list-users', '42']);
    expect(mockClient.listMetricAccessUsers).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should grant metric access user', async () => {
    mockClient.grantMetricAccessUser.mockResolvedValue(undefined);
    await metricsCommand.parseAsync([
      'node',
      'test',
      'access',
      'grant-user',
      '42',
      '--user',
      '1',
      '--role',
      '2',
    ]);
    expect(mockClient.grantMetricAccessUser).toHaveBeenCalledWith(42, 1, 2);
  });

  it('should revoke metric access user', async () => {
    mockClient.revokeMetricAccessUser.mockResolvedValue(undefined);
    await metricsCommand.parseAsync([
      'node',
      'test',
      'access',
      'revoke-user',
      '42',
      '--user',
      '1',
      '--role',
      '2',
    ]);
    expect(mockClient.revokeMetricAccessUser).toHaveBeenCalledWith(42, 1, 2);
  });

  it('should list metric access teams', async () => {
    mockClient.listMetricAccessTeams.mockResolvedValue([{ team_id: 1, asset_role_id: 2 }]);
    await metricsCommand.parseAsync(['node', 'test', 'access', 'list-teams', '42']);
    expect(mockClient.listMetricAccessTeams).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should grant metric access team', async () => {
    mockClient.grantMetricAccessTeam.mockResolvedValue(undefined);
    await metricsCommand.parseAsync([
      'node',
      'test',
      'access',
      'grant-team',
      '42',
      '--team',
      '5',
      '--role',
      '2',
    ]);
    expect(mockClient.grantMetricAccessTeam).toHaveBeenCalledWith(42, 5, 2);
  });

  it('should revoke metric access team', async () => {
    mockClient.revokeMetricAccessTeam.mockResolvedValue(undefined);
    await metricsCommand.parseAsync([
      'node',
      'test',
      'access',
      'revoke-team',
      '42',
      '--team',
      '5',
      '--role',
      '2',
    ]);
    expect(mockClient.revokeMetricAccessTeam).toHaveBeenCalledWith(42, 5, 2);
  });
});
