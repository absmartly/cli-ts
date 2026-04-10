import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { membersCommand } from './members.js';
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

describe('team members command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listTeamMembers: vi.fn(),
    addTeamMembers: vi.fn(),
    editTeamMemberRoles: vi.fn(),
    removeTeamMembers: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(membersCommand);
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

  it('should list team members', async () => {
    mockClient.listTeamMembers.mockResolvedValue([{ id: 1, email: 'user@example.com' }]);
    await membersCommand.parseAsync(['node', 'test', 'list', '1']);
    expect(mockClient.listTeamMembers).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should add team members', async () => {
    mockClient.addTeamMembers.mockResolvedValue(undefined);
    await membersCommand.parseAsync(['node', 'test', 'add', '1', '--users', '2,3']);
    expect(mockClient.addTeamMembers).toHaveBeenCalledWith(1, [2, 3], undefined);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Added');
  });

  it('should add team members with roles', async () => {
    mockClient.addTeamMembers.mockResolvedValue(undefined);
    await membersCommand.parseAsync(['node', 'test', 'add', '1', '--users', '2', '--roles', '5,6']);
    expect(mockClient.addTeamMembers).toHaveBeenCalledWith(1, [2], [5, 6]);
  });

  it('should edit team member roles', async () => {
    mockClient.editTeamMemberRoles.mockResolvedValue(undefined);
    await membersCommand.parseAsync([
      'node',
      'test',
      'edit-roles',
      '1',
      '--users',
      '2,3',
      '--roles',
      '4',
    ]);
    expect(mockClient.editTeamMemberRoles).toHaveBeenCalledWith(1, [2, 3], [4]);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Updated roles');
  });

  it('should remove team members', async () => {
    mockClient.removeTeamMembers.mockResolvedValue(undefined);
    await membersCommand.parseAsync(['node', 'test', 'remove', '1', '--users', '2,3']);
    expect(mockClient.removeTeamMembers).toHaveBeenCalledWith(1, [2, 3]);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Removed');
  });
});
