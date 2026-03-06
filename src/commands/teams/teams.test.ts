import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { teamsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('teams command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listTeams: vi.fn().mockResolvedValue([{ id: 1, name: 'engineering' }]),
    getTeam: vi.fn().mockResolvedValue({ id: 1, name: 'engineering' }),
    createTeam: vi.fn().mockResolvedValue({ id: 99 }),
    updateTeam: vi.fn().mockResolvedValue({}),
    archiveTeam: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(teamsCommand);
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

  it('should list teams', async () => {
    await teamsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listTeams).toHaveBeenCalledWith(undefined);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list teams with --include-archived', async () => {
    await teamsCommand.parseAsync(['node', 'test', 'list', '--include-archived']);

    expect(mockClient.listTeams).toHaveBeenCalledWith(true);
  });

  it('should get team by id', async () => {
    await teamsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getTeam).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });

  it('should create a team', async () => {
    await teamsCommand.parseAsync(['node', 'test', 'create', '--name', 'new_team']);

    expect(mockClient.createTeam).toHaveBeenCalledWith({ name: 'new_team' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Team created');
  });

  it('should update a team', async () => {
    await teamsCommand.parseAsync(['node', 'test', 'update', '1', '--description', 'x']);

    expect(mockClient.updateTeam).toHaveBeenCalledWith(1, { description: 'x' });
  });

  it('should archive a team', async () => {
    await teamsCommand.parseAsync(['node', 'test', 'archive', '1']);

    expect(mockClient.archiveTeam).toHaveBeenCalledWith(1, undefined);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('archived');
  });

  it('should unarchive a team', async () => {
    await teamsCommand.parseAsync(['node', 'test', 'archive', '1', '--unarchive']);

    expect(mockClient.archiveTeam).toHaveBeenCalledWith(1, true);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('unarchived');
  });
});
