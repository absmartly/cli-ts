import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listMetrics, resolveOwnerIds, resolveTeamIds } from './list.js';
import { getMetric } from './get.js';
import { createMetric } from './create.js';
import { updateMetric } from './update.js';
import { archiveMetric } from './archive.js';
import { activateMetric } from './activate.js';
import { followMetric, unfollowMetric } from './follow.js';
import {
  listMetricAccessUsers,
  grantMetricAccessUser,
  revokeMetricAccessUser,
  listMetricAccessTeams,
  grantMetricAccessTeam,
  revokeMetricAccessTeam,
} from './access.js';
import {
  getMetricReview,
  requestMetricReview,
  approveMetricReview,
  listMetricReviewComments,
  addMetricReviewComment,
  replyToMetricReviewComment,
} from './review.js';

const mockClient = {
  listMetrics: vi.fn(),
  getMetric: vi.fn(),
  createMetric: vi.fn(),
  updateMetric: vi.fn(),
  archiveMetric: vi.fn(),
  activateMetric: vi.fn(),
  followMetric: vi.fn(),
  unfollowMetric: vi.fn(),
  listMetricAccessUsers: vi.fn(),
  grantMetricAccessUser: vi.fn(),
  revokeMetricAccessUser: vi.fn(),
  listMetricAccessTeams: vi.fn(),
  grantMetricAccessTeam: vi.fn(),
  revokeMetricAccessTeam: vi.fn(),
  getMetricReview: vi.fn(),
  requestMetricReview: vi.fn(),
  approveMetricReview: vi.fn(),
  listMetricReviewComments: vi.fn(),
  addMetricReviewComment: vi.fn(),
  replyToMetricReviewComment: vi.fn(),
  resolveUsers: vi.fn(),
  resolveTeams: vi.fn(),
} as any;

beforeEach(() => vi.clearAllMocks());

describe('resolveOwnerIds', () => {
  it('should return numeric ids as-is', async () => {
    const result = await resolveOwnerIds(mockClient, '1,2,3');
    expect(result).toBe('1,2,3');
    expect(mockClient.resolveUsers).not.toHaveBeenCalled();
  });

  it('should resolve non-numeric refs via API', async () => {
    mockClient.resolveUsers.mockResolvedValue([{ id: 10 }, { id: 20 }]);

    const result = await resolveOwnerIds(mockClient, 'alice@test.com,bob@test.com');

    expect(mockClient.resolveUsers).toHaveBeenCalledWith(['alice@test.com', 'bob@test.com']);
    expect(result).toBe('10,20');
  });
});

describe('resolveTeamIds', () => {
  it('should return numeric ids as-is', async () => {
    const result = await resolveTeamIds(mockClient, '5,6');
    expect(result).toBe('5,6');
    expect(mockClient.resolveTeams).not.toHaveBeenCalled();
  });

  it('should resolve non-numeric refs via API', async () => {
    mockClient.resolveTeams.mockResolvedValue([{ id: 100 }]);

    const result = await resolveTeamIds(mockClient, 'team-alpha');

    expect(mockClient.resolveTeams).toHaveBeenCalledWith(['team-alpha']);
    expect(result).toBe('100');
  });
});

describe('listMetrics', () => {
  it('should list metrics with pagination', async () => {
    const metrics = [{ id: 1 }, { id: 2 }];
    mockClient.listMetrics.mockResolvedValue(metrics);

    const result = await listMetrics(mockClient, { items: 10, page: 1 });

    expect(mockClient.listMetrics).toHaveBeenCalledWith({
      items: 10,
      page: 1,
      archived: undefined,
      include_drafts: undefined,
      search: undefined,
      sort: undefined,
      sort_asc: undefined,
      ids: undefined,
      owners: undefined,
      teams: undefined,
      review_status: undefined,
    });
    expect(result.data).toEqual(metrics);
    expect(result.pagination).toEqual({ page: 1, items: 10, hasMore: false });
  });

  it('should resolve owners and teams when provided', async () => {
    mockClient.resolveUsers.mockResolvedValue([{ id: 42 }]);
    mockClient.resolveTeams.mockResolvedValue([{ id: 99 }]);
    mockClient.listMetrics.mockResolvedValue([]);

    await listMetrics(mockClient, {
      items: 10,
      page: 1,
      owners: 'alice@test.com',
      teams: 'team-alpha',
    });

    expect(mockClient.listMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ owners: '42', teams: '99' })
    );
  });

  it('should detect hasMore when data fills page', async () => {
    mockClient.listMetrics.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: i })));

    const result = await listMetrics(mockClient, { items: 10, page: 1 });

    expect(result.pagination!.hasMore).toBe(true);
  });
});

describe('getMetric', () => {
  it('should get metric by id', async () => {
    const metric = { id: 5, name: 'CTR' };
    mockClient.getMetric.mockResolvedValue(metric);

    const result = await getMetric(mockClient, { id: 5 as any });

    expect(mockClient.getMetric).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: metric });
  });
});

describe('createMetric', () => {
  it('should create with required fields', async () => {
    mockClient.createMetric.mockResolvedValue({ id: 10 });

    const result = await createMetric(mockClient, {
      name: 'CTR',
      type: 'ratio',
      description: 'Click-through rate',
    });

    expect(mockClient.createMetric).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'CTR', type: 'ratio', description: 'Click-through rate' })
    );
    expect(result).toEqual({ data: { id: 10 } });
  });

  it('should include optional fields', async () => {
    mockClient.createMetric.mockResolvedValue({ id: 11 });

    await createMetric(mockClient, {
      name: 'Rev',
      type: 'sum',
      description: 'Revenue',
      goalId: 3,
      owner: 7,
      valueSourceProperty: 'amount',
    });

    expect(mockClient.createMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        goal_id: 3,
        owners: [{ user_id: 7 }],
        value_source_property: 'amount',
      })
    );
  });
});

describe('updateMetric', () => {
  it('should update description', async () => {
    mockClient.updateMetric.mockResolvedValue(undefined);

    const result = await updateMetric(mockClient, { id: 5 as any, description: 'new' });

    expect(mockClient.updateMetric).toHaveBeenCalledWith(5, { description: 'new' });
    expect(result).toEqual({ data: undefined });
  });

  it('should throw when no fields', async () => {
    await expect(updateMetric(mockClient, { id: 5 as any })).rejects.toThrow(
      'At least one update field is required'
    );
  });
});

describe('archiveMetric', () => {
  it('should archive a metric', async () => {
    mockClient.archiveMetric.mockResolvedValue(undefined);

    const result = await archiveMetric(mockClient, { id: 5 as any });

    expect(mockClient.archiveMetric).toHaveBeenCalledWith(5, undefined);
    expect(result).toEqual({ data: undefined });
  });

  it('should unarchive a metric', async () => {
    mockClient.archiveMetric.mockResolvedValue(undefined);

    const result = await archiveMetric(mockClient, { id: 5 as any, unarchive: true });

    expect(mockClient.archiveMetric).toHaveBeenCalledWith(5, true);
    expect(result).toEqual({ data: undefined });
  });
});

describe('activateMetric', () => {
  it('should activate a metric with reason', async () => {
    mockClient.activateMetric.mockResolvedValue(undefined);

    const result = await activateMetric(mockClient, { id: 5 as any, reason: 'ready' });

    expect(mockClient.activateMetric).toHaveBeenCalledWith(5, 'ready');
    expect(result).toEqual({ data: undefined });
  });
});

describe('followMetric', () => {
  it('should follow a metric', async () => {
    mockClient.followMetric.mockResolvedValue(undefined);

    const result = await followMetric(mockClient, { id: 5 as any });

    expect(mockClient.followMetric).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: undefined });
  });
});

describe('unfollowMetric', () => {
  it('should unfollow a metric', async () => {
    mockClient.unfollowMetric.mockResolvedValue(undefined);

    const result = await unfollowMetric(mockClient, { id: 5 as any });

    expect(mockClient.unfollowMetric).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: undefined });
  });
});

describe('listMetricAccessUsers', () => {
  it('should list access users', async () => {
    const users = [{ userId: 1 }];
    mockClient.listMetricAccessUsers.mockResolvedValue(users);

    const result = await listMetricAccessUsers(mockClient, { id: 5 as any });

    expect(mockClient.listMetricAccessUsers).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: users });
  });
});

describe('grantMetricAccessUser', () => {
  it('should grant user access', async () => {
    mockClient.grantMetricAccessUser.mockResolvedValue(undefined);

    const result = await grantMetricAccessUser(mockClient, {
      id: 5 as any,
      userId: 10 as any,
      roleId: 20 as any,
    });

    expect(mockClient.grantMetricAccessUser).toHaveBeenCalledWith(5, 10, 20);
    expect(result).toEqual({ data: undefined });
  });
});

describe('revokeMetricAccessUser', () => {
  it('should revoke user access', async () => {
    mockClient.revokeMetricAccessUser.mockResolvedValue(undefined);

    const result = await revokeMetricAccessUser(mockClient, {
      id: 5 as any,
      userId: 10 as any,
      roleId: 20 as any,
    });

    expect(mockClient.revokeMetricAccessUser).toHaveBeenCalledWith(5, 10, 20);
    expect(result).toEqual({ data: undefined });
  });
});

describe('listMetricAccessTeams', () => {
  it('should list access teams', async () => {
    const teams = [{ teamId: 1 }];
    mockClient.listMetricAccessTeams.mockResolvedValue(teams);

    const result = await listMetricAccessTeams(mockClient, { id: 5 as any });

    expect(mockClient.listMetricAccessTeams).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: teams });
  });
});

describe('grantMetricAccessTeam', () => {
  it('should grant team access', async () => {
    mockClient.grantMetricAccessTeam.mockResolvedValue(undefined);

    const result = await grantMetricAccessTeam(mockClient, {
      id: 5 as any,
      teamId: 10 as any,
      roleId: 20 as any,
    });

    expect(mockClient.grantMetricAccessTeam).toHaveBeenCalledWith(5, 10, 20);
    expect(result).toEqual({ data: undefined });
  });
});

describe('revokeMetricAccessTeam', () => {
  it('should revoke team access', async () => {
    mockClient.revokeMetricAccessTeam.mockResolvedValue(undefined);

    const result = await revokeMetricAccessTeam(mockClient, {
      id: 5 as any,
      teamId: 10 as any,
      roleId: 20 as any,
    });

    expect(mockClient.revokeMetricAccessTeam).toHaveBeenCalledWith(5, 10, 20);
    expect(result).toEqual({ data: undefined });
  });
});

describe('getMetricReview', () => {
  it('should get review', async () => {
    const review = { status: 'pending' };
    mockClient.getMetricReview.mockResolvedValue(review);

    const result = await getMetricReview(mockClient, { id: 5 as any });

    expect(mockClient.getMetricReview).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: review });
  });
});

describe('requestMetricReview', () => {
  it('should request review', async () => {
    mockClient.requestMetricReview.mockResolvedValue(undefined);

    const result = await requestMetricReview(mockClient, { id: 5 as any });

    expect(mockClient.requestMetricReview).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: undefined });
  });
});

describe('approveMetricReview', () => {
  it('should approve review', async () => {
    mockClient.approveMetricReview.mockResolvedValue(undefined);

    const result = await approveMetricReview(mockClient, { id: 5 as any });

    expect(mockClient.approveMetricReview).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: undefined });
  });
});

describe('listMetricReviewComments', () => {
  it('should list comments', async () => {
    const comments = [{ id: 1, message: 'hi' }];
    mockClient.listMetricReviewComments.mockResolvedValue(comments);

    const result = await listMetricReviewComments(mockClient, { id: 5 as any });

    expect(mockClient.listMetricReviewComments).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: comments });
  });
});

describe('addMetricReviewComment', () => {
  it('should add comment', async () => {
    mockClient.addMetricReviewComment.mockResolvedValue(undefined);

    const result = await addMetricReviewComment(mockClient, { id: 5 as any, message: 'LGTM' });

    expect(mockClient.addMetricReviewComment).toHaveBeenCalledWith(5, 'LGTM');
    expect(result).toEqual({ data: undefined });
  });
});

describe('replyToMetricReviewComment', () => {
  it('should reply to comment', async () => {
    mockClient.replyToMetricReviewComment.mockResolvedValue(undefined);

    const result = await replyToMetricReviewComment(mockClient, {
      id: 5 as any,
      commentId: 10,
      message: 'Thanks!',
    });

    expect(mockClient.replyToMetricReviewComment).toHaveBeenCalledWith(5, 10, 'Thanks!');
    expect(result).toEqual({ data: undefined });
  });
});
