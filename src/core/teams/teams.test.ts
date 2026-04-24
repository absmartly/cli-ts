import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listTeams } from './list.js';
import { getTeam } from './get.js';
import { createTeam } from './create.js';
import { updateTeam } from './update.js';
import { archiveTeam } from './archive.js';
import {
  listTeamMembers,
  addTeamMembers,
  editTeamMemberRoles,
  removeTeamMembers,
} from './members.js';

const mockClient = {
  listTeams: vi.fn(),
  getTeam: vi.fn(),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  archiveTeam: vi.fn(),
  listTeamMembers: vi.fn(),
  addTeamMembers: vi.fn(),
  editTeamMemberRoles: vi.fn(),
  removeTeamMembers: vi.fn(),
} as any;

beforeEach(() => vi.clearAllMocks());

describe('listTeams', () => {
  it('should list teams', async () => {
    const teams = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ];
    mockClient.listTeams.mockResolvedValue(teams);

    const result = await listTeams(mockClient, { items: 10, page: 1 });

    expect(mockClient.listTeams).toHaveBeenCalledWith({
      includeArchived: false,
      items: 10,
      page: 1,
    });
    expect(result.data).toEqual(teams);
    expect(result.rows).toBeDefined();
  });

  it('should pass includeArchived', async () => {
    mockClient.listTeams.mockResolvedValue([]);

    await listTeams(mockClient, { items: 10, page: 1, includeArchived: true });

    expect(mockClient.listTeams).toHaveBeenCalledWith({
      includeArchived: true,
      items: 10,
      page: 1,
    });
  });
});

describe('getTeam', () => {
  it('should get team by id', async () => {
    const team = { id: 1, name: 'Team A' };
    mockClient.getTeam.mockResolvedValue(team);

    const result = await getTeam(mockClient, { id: 1 as any });

    expect(mockClient.getTeam).toHaveBeenCalledWith(1);
    expect(result.data).toBeDefined();
  });

  it('should return raw data when raw=true', async () => {
    const team = { id: 1, name: 'Team A', extra: 'stuff' };
    mockClient.getTeam.mockResolvedValue(team);

    const result = await getTeam(mockClient, { id: 1 as any, raw: true });

    expect(result.data).toEqual(team);
  });
});

describe('createTeam', () => {
  it('should create with name only', async () => {
    const created = { id: 5, name: 'New Team' };
    mockClient.createTeam.mockResolvedValue(created);

    const result = await createTeam(mockClient, { name: 'New Team' });

    expect(mockClient.createTeam).toHaveBeenCalledWith({ name: 'New Team' });
    expect(result).toEqual({ data: created });
  });

  it('should include description', async () => {
    mockClient.createTeam.mockResolvedValue({ id: 6 });

    await createTeam(mockClient, { name: 'T', description: 'desc' });

    expect(mockClient.createTeam).toHaveBeenCalledWith({ name: 'T', description: 'desc' });
  });
});

describe('updateTeam', () => {
  it('should update description', async () => {
    mockClient.updateTeam.mockResolvedValue(undefined);

    const result = await updateTeam(mockClient, { id: 5 as any, description: 'new desc' });

    expect(mockClient.updateTeam).toHaveBeenCalledWith(5, { description: 'new desc' });
    expect(result).toEqual({ data: { id: 5 } });
  });

  it('should throw when no fields provided', async () => {
    await expect(updateTeam(mockClient, { id: 5 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });
});

describe('archiveTeam', () => {
  it('should archive a team', async () => {
    mockClient.archiveTeam.mockResolvedValue(undefined);

    const result = await archiveTeam(mockClient, { id: 3 as any });

    expect(mockClient.archiveTeam).toHaveBeenCalledWith(3, undefined);
    expect(result).toEqual({ data: { id: 3, archived: true } });
  });

  it('should unarchive a team', async () => {
    mockClient.archiveTeam.mockResolvedValue(undefined);

    const result = await archiveTeam(mockClient, { id: 3 as any, unarchive: true });

    expect(mockClient.archiveTeam).toHaveBeenCalledWith(3, true);
    expect(result).toEqual({ data: { id: 3, archived: false } });
  });
});

describe('listTeamMembers', () => {
  it('should list members', async () => {
    const members = [{ userId: 1 }, { userId: 2 }];
    mockClient.listTeamMembers.mockResolvedValue(members);

    const result = await listTeamMembers(mockClient, { id: 5 as any });

    expect(mockClient.listTeamMembers).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: members });
  });
});

describe('addTeamMembers', () => {
  it('should add members', async () => {
    mockClient.addTeamMembers.mockResolvedValue(undefined);

    const result = await addTeamMembers(mockClient, {
      id: 5 as any,
      userIds: [1 as any, 2 as any],
      roleIds: [10 as any],
    });

    expect(mockClient.addTeamMembers).toHaveBeenCalledWith(5, [1, 2], [10]);
    expect(result).toEqual({ data: { teamId: 5, addedUsers: 2 } });
  });
});

describe('editTeamMemberRoles', () => {
  it('should edit roles', async () => {
    mockClient.editTeamMemberRoles.mockResolvedValue(undefined);

    const result = await editTeamMemberRoles(mockClient, {
      id: 5 as any,
      userIds: [1 as any],
      roleIds: [10 as any],
    });

    expect(mockClient.editTeamMemberRoles).toHaveBeenCalledWith(5, [1], [10]);
    expect(result).toEqual({ data: { teamId: 5, updatedUsers: 1 } });
  });
});

describe('removeTeamMembers', () => {
  it('should remove members', async () => {
    mockClient.removeTeamMembers.mockResolvedValue(undefined);

    const result = await removeTeamMembers(mockClient, {
      id: 5 as any,
      userIds: [1 as any, 2 as any],
    });

    expect(mockClient.removeTeamMembers).toHaveBeenCalledWith(5, [1, 2]);
    expect(result).toEqual({ data: { teamId: 5, removedUsers: 2 } });
  });
});
