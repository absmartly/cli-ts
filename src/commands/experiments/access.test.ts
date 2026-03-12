import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { experimentsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('experiments access command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listExperimentAccessUsers: vi.fn(),
    grantExperimentAccessUser: vi.fn(),
    revokeExperimentAccessUser: vi.fn(),
    listExperimentAccessTeams: vi.fn(),
    grantExperimentAccessTeam: vi.fn(),
    revokeExperimentAccessTeam: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(experimentsCommand);
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

  it('should list experiment access users', async () => {
    mockClient.listExperimentAccessUsers.mockResolvedValue([{ user_id: 1, asset_role_id: 2 }]);
    await experimentsCommand.parseAsync(['node', 'test', 'access', 'list-users', '42']);
    expect(mockClient.listExperimentAccessUsers).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should grant experiment access user', async () => {
    mockClient.grantExperimentAccessUser.mockResolvedValue(undefined);
    await experimentsCommand.parseAsync(['node', 'test', 'access', 'grant-user', '42', '--user', '1', '--role', '2']);
    expect(mockClient.grantExperimentAccessUser).toHaveBeenCalledWith(42, 1, 2);
  });

  it('should revoke experiment access user', async () => {
    mockClient.revokeExperimentAccessUser.mockResolvedValue(undefined);
    await experimentsCommand.parseAsync(['node', 'test', 'access', 'revoke-user', '42', '--user', '1', '--role', '2']);
    expect(mockClient.revokeExperimentAccessUser).toHaveBeenCalledWith(42, 1, 2);
  });

  it('should list experiment access teams', async () => {
    mockClient.listExperimentAccessTeams.mockResolvedValue([{ team_id: 1, asset_role_id: 2 }]);
    await experimentsCommand.parseAsync(['node', 'test', 'access', 'list-teams', '42']);
    expect(mockClient.listExperimentAccessTeams).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should grant experiment access team', async () => {
    mockClient.grantExperimentAccessTeam.mockResolvedValue(undefined);
    await experimentsCommand.parseAsync(['node', 'test', 'access', 'grant-team', '42', '--team', '5', '--role', '2']);
    expect(mockClient.grantExperimentAccessTeam).toHaveBeenCalledWith(42, 5, 2);
  });

  it('should revoke experiment access team', async () => {
    mockClient.revokeExperimentAccessTeam.mockResolvedValue(undefined);
    await experimentsCommand.parseAsync(['node', 'test', 'access', 'revoke-team', '42', '--team', '5', '--role', '2']);
    expect(mockClient.revokeExperimentAccessTeam).toHaveBeenCalledWith(42, 5, 2);
  });
});
