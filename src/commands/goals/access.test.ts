import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { goalsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('goals access command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listGoalAccessUsers: vi.fn(),
    grantGoalAccessUser: vi.fn(),
    revokeGoalAccessUser: vi.fn(),
    listGoalAccessTeams: vi.fn(),
    grantGoalAccessTeam: vi.fn(),
    revokeGoalAccessTeam: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(goalsCommand);
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

  it('should list goal access users', async () => {
    mockClient.listGoalAccessUsers.mockResolvedValue([{ user_id: 1, asset_role_id: 2 }]);
    await goalsCommand.parseAsync(['node', 'test', 'access', 'list-users', '42']);
    expect(mockClient.listGoalAccessUsers).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should grant goal access user', async () => {
    mockClient.grantGoalAccessUser.mockResolvedValue(undefined);
    await goalsCommand.parseAsync(['node', 'test', 'access', 'grant-user', '42', '--user', '1', '--role', '2']);
    expect(mockClient.grantGoalAccessUser).toHaveBeenCalledWith(42, 1, 2);
  });

  it('should revoke goal access user', async () => {
    mockClient.revokeGoalAccessUser.mockResolvedValue(undefined);
    await goalsCommand.parseAsync(['node', 'test', 'access', 'revoke-user', '42', '--user', '1', '--role', '2']);
    expect(mockClient.revokeGoalAccessUser).toHaveBeenCalledWith(42, 1, 2);
  });

  it('should list goal access teams', async () => {
    mockClient.listGoalAccessTeams.mockResolvedValue([{ team_id: 1, asset_role_id: 2 }]);
    await goalsCommand.parseAsync(['node', 'test', 'access', 'list-teams', '42']);
    expect(mockClient.listGoalAccessTeams).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should grant goal access team', async () => {
    mockClient.grantGoalAccessTeam.mockResolvedValue(undefined);
    await goalsCommand.parseAsync(['node', 'test', 'access', 'grant-team', '42', '--team', '5', '--role', '2']);
    expect(mockClient.grantGoalAccessTeam).toHaveBeenCalledWith(42, 5, 2);
  });

  it('should revoke goal access team', async () => {
    mockClient.revokeGoalAccessTeam.mockResolvedValue(undefined);
    await goalsCommand.parseAsync(['node', 'test', 'access', 'revoke-team', '42', '--team', '5', '--role', '2']);
    expect(mockClient.revokeGoalAccessTeam).toHaveBeenCalledWith(42, 5, 2);
  });
});
