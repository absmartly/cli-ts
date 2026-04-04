import { describe, it, expect, vi } from 'vitest';
import {
  listExperimentAccessUsers,
  grantExperimentAccessUser,
  revokeExperimentAccessUser,
  listExperimentAccessTeams,
  grantExperimentAccessTeam,
  revokeExperimentAccessTeam,
} from './access.js';

describe('experiments/access', () => {
  const mockClient = {
    listExperimentAccessUsers: vi.fn(),
    grantExperimentAccessUser: vi.fn(),
    revokeExperimentAccessUser: vi.fn(),
    listExperimentAccessTeams: vi.fn(),
    grantExperimentAccessTeam: vi.fn(),
    revokeExperimentAccessTeam: vi.fn(),
  };

  it('should list access users', async () => {
    const users = [{ id: 1, name: 'Alice' }];
    mockClient.listExperimentAccessUsers.mockResolvedValue(users);
    const result = await listExperimentAccessUsers(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.listExperimentAccessUsers).toHaveBeenCalledWith(10);
    expect(result.data).toEqual(users);
  });

  it('should grant user access', async () => {
    mockClient.grantExperimentAccessUser.mockResolvedValue(undefined);
    const result = await grantExperimentAccessUser(mockClient as any, {
      experimentId: 10 as any,
      userId: 5 as any,
      roleId: 2 as any,
    });
    expect(mockClient.grantExperimentAccessUser).toHaveBeenCalledWith(10, 5, 2);
    expect(result.data).toEqual({ experimentId: 10, userId: 5 });
  });

  it('should revoke user access', async () => {
    mockClient.revokeExperimentAccessUser.mockResolvedValue(undefined);
    const result = await revokeExperimentAccessUser(mockClient as any, {
      experimentId: 10 as any,
      userId: 5 as any,
      roleId: 2 as any,
    });
    expect(mockClient.revokeExperimentAccessUser).toHaveBeenCalledWith(10, 5, 2);
    expect(result.data).toEqual({ experimentId: 10, userId: 5 });
  });

  it('should list access teams', async () => {
    const teams = [{ id: 1, name: 'Engineering' }];
    mockClient.listExperimentAccessTeams.mockResolvedValue(teams);
    const result = await listExperimentAccessTeams(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.listExperimentAccessTeams).toHaveBeenCalledWith(10);
    expect(result.data).toEqual(teams);
  });

  it('should grant team access', async () => {
    mockClient.grantExperimentAccessTeam.mockResolvedValue(undefined);
    const result = await grantExperimentAccessTeam(mockClient as any, {
      experimentId: 10 as any,
      teamId: 3 as any,
      roleId: 2 as any,
    });
    expect(mockClient.grantExperimentAccessTeam).toHaveBeenCalledWith(10, 3, 2);
    expect(result.data).toEqual({ experimentId: 10, teamId: 3 });
  });

  it('should revoke team access', async () => {
    mockClient.revokeExperimentAccessTeam.mockResolvedValue(undefined);
    const result = await revokeExperimentAccessTeam(mockClient as any, {
      experimentId: 10 as any,
      teamId: 3 as any,
      roleId: 2 as any,
    });
    expect(mockClient.revokeExperimentAccessTeam).toHaveBeenCalledWith(10, 3, 2);
    expect(result.data).toEqual({ experimentId: 10, teamId: 3 });
  });
});
