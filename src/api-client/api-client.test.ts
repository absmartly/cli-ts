import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server.js';
import { createAPIClient } from '../lib/api/client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('APIClient core', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  afterEach(() => {
    server.resetHandlers();
  });

  describe('error status handling', () => {
    it('should throw with 401 unauthorized message', async () => {
      server.use(http.get(`${BASE_URL}/experiments`, () => new HttpResponse(null, { status: 401 })));
      await expect(client.listExperiments()).rejects.toThrow(/Unauthorized/);
    });

    it('should throw with 403 forbidden message', async () => {
      server.use(http.get(`${BASE_URL}/experiments`, () => new HttpResponse(null, { status: 403 })));
      await expect(client.listExperiments()).rejects.toThrow(/Forbidden/);
    });

    it('should throw with 404 not found message', async () => {
      server.use(http.get(`${BASE_URL}/experiments/999`, () => new HttpResponse(null, { status: 404 })));
      await expect(client.getExperiment(999)).rejects.toThrow(/Not found/);
    });

    it('should throw with 429 rate limit message', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () =>
          new HttpResponse(null, { status: 429, headers: { 'retry-after': '30' } })
        )
      );
      await expect(client.listExperiments()).rejects.toThrow(/Rate limit/);
    });

    it('should throw generic error for 500', async () => {
      server.use(http.get(`${BASE_URL}/roles`, () => new HttpResponse(null, { status: 500 })));
      await expect(client.listRoles()).rejects.toThrow(/API error/);
    });
  });

  describe('validateListResponse', () => {
    it('should throw when response is not an object', async () => {
      server.use(http.get(`${BASE_URL}/goals`, () => HttpResponse.json('not-an-object')));
      await expect(client.listGoals()).rejects.toThrow(/Expected object/);
    });

    it('should throw when expected key is missing', async () => {
      server.use(http.get(`${BASE_URL}/goals`, () => HttpResponse.json({ wrong_key: [] })));
      await expect(client.listGoals()).rejects.toThrow(/Missing "goals" field/);
    });

    it('should throw when expected key is not an array', async () => {
      server.use(http.get(`${BASE_URL}/goals`, () => HttpResponse.json({ goals: 'not-array' })));
      await expect(client.listGoals()).rejects.toThrow(/must be an array/);
    });
  });

  describe('validateEntityResponse', () => {
    it('should throw when response is not an object', async () => {
      server.use(http.get(`${BASE_URL}/goals/1`, () => HttpResponse.json('not-an-object')));
      await expect(client.getGoal(1)).rejects.toThrow(/Expected object/);
    });

    it('should throw when expected key is missing', async () => {
      server.use(http.get(`${BASE_URL}/goals/1`, () => HttpResponse.json({ wrong_key: {} })));
      await expect(client.getGoal(1)).rejects.toThrow(/Missing "goal" field/);
    });
  });

  describe('validateOkResponse', () => {
    it('should throw when ok is false with errors', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments/1/export_data`, () =>
          HttpResponse.json({ ok: false, errors: ['denied'] })
        )
      );
      await expect(client.exportExperimentData(1)).rejects.toThrow(/denied/);
    });

    it('should succeed when ok is true', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments/1/export_data`, () =>
          HttpResponse.json({ ok: true, errors: [] })
        )
      );
      await expect(client.exportExperimentData(1)).resolves.toBeUndefined();
    });
  });

  describe('experiments CRUD', () => {
    it('should list experiments with filters', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, ({ request }) => {
          const params = new URL(request.url).searchParams;
          return HttpResponse.json({ experiments: [{ id: 1, name: 'test', state: params.get('state') }] });
        })
      );
      const result = await client.listExperiments({ state: 'running', limit: 10 });
      expect(result[0].state).toBe('running');
    });

    it('should get experiment by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments/42`, () =>
          HttpResponse.json({ experiment: { id: 42, name: 'test' } })
        )
      );
      const result = await client.getExperiment(42);
      expect(result.id).toBe(42);
    });

    it('should create experiment', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments`, () =>
          HttpResponse.json({ ok: true, experiment: { id: 1, name: 'new' }, errors: [] })
        )
      );
      const result = await client.createExperiment({ name: 'new' } as any);
      expect(result.id).toBe(1);
    });

    it('should start experiment', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/1/start`, () =>
          HttpResponse.json({ experiment: { id: 1, name: 'test', state: 'running' } })
        )
      );
      const result = await client.startExperiment(1);
      expect(result.state).toBe('running');
    });

    it('should stop experiment with reason', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/1/stop`, async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ experiment: { id: 1, name: 'test', state: 'stopped', reason: body.reason } });
        })
      );
      const result = await client.stopExperiment(1, 'complete');
      expect(result.state).toBe('stopped');
    });

    it('should archive experiment', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/1/archive`, async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body.archive).toBe(true);
          return HttpResponse.json({ ok: true });
        })
      );
      await client.archiveExperiment(1);
    });

    it('should unarchive experiment', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/1/archive`, async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body.archive).toBe(false);
          return HttpResponse.json({ ok: true });
        })
      );
      await client.archiveExperiment(1, true);
    });

    it('should delete experiment', async () => {
      server.use(
        http.delete(`${BASE_URL}/experiments/1`, () =>
          HttpResponse.json({ ok: true, errors: [] })
        )
      );
      await client.deleteExperiment(1);
    });

    it('should get parent experiment', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments/1/parent`, () =>
          HttpResponse.json({ parent_experiment: { id: 2, name: 'parent' } })
        )
      );
      const result = await client.getParentExperiment(1);
      expect(result.id).toBe(2);
    });

    it('should put experiment to development', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/1/development`, () =>
          HttpResponse.json({ experiment: { id: 1, name: 'test', state: 'development' } })
        )
      );
      const result = await client.developmentExperiment(1, 'testing');
      expect(result.state).toBe('development');
    });

    it('should full-on experiment', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/1/full_on`, () =>
          HttpResponse.json({ experiment: { id: 1, name: 'test' } })
        )
      );
      const result = await client.fullOnExperiment(1, 1, 'winner');
      expect(result.id).toBe(1);
    });
  });

  describe('goals CRUD', () => {
    it('should list goals with pagination', async () => {
      server.use(
        http.get(`${BASE_URL}/goals`, () => HttpResponse.json({ goals: [{ id: 1, name: 'g1' }] }))
      );
      const result = await client.listGoals(50, 10);
      expect(result).toHaveLength(1);
    });

    it('should get goal', async () => {
      server.use(
        http.get(`${BASE_URL}/goals/1`, () => HttpResponse.json({ goal: { id: 1, name: 'g1' } }))
      );
      expect((await client.getGoal(1)).id).toBe(1);
    });

    it('should create goal', async () => {
      server.use(
        http.post(`${BASE_URL}/goals`, () => HttpResponse.json({ goal: { id: 1, name: 'new' } }))
      );
      expect((await client.createGoal({ name: 'new' } as any)).id).toBe(1);
    });

    it('should update goal', async () => {
      server.use(
        http.put(`${BASE_URL}/goals/1`, () => HttpResponse.json({ goal: { id: 1, name: 'updated' } }))
      );
      expect((await client.updateGoal(1, { name: 'updated' } as any)).name).toBe('updated');
    });
  });

  describe('segments CRUD', () => {
    it('should list segments', async () => {
      server.use(
        http.get(`${BASE_URL}/segments`, () => HttpResponse.json({ segments: [] }))
      );
      expect(await client.listSegments()).toEqual([]);
    });

    it('should create segment', async () => {
      server.use(
        http.post(`${BASE_URL}/segments`, () => HttpResponse.json({ segment: { id: 1, name: 's1' } }))
      );
      expect((await client.createSegment({ name: 's1' } as any)).id).toBe(1);
    });

    it('should delete segment', async () => {
      server.use(http.delete(`${BASE_URL}/segments/1`, () => new HttpResponse(null, { status: 204 })));
      await client.deleteSegment(1);
    });
  });

  describe('teams CRUD', () => {
    it('should list teams with include_archived', async () => {
      server.use(
        http.get(`${BASE_URL}/teams`, ({ request }) => {
          const params = new URL(request.url).searchParams;
          expect(params.get('include_archived')).toBe('1');
          return HttpResponse.json({ teams: [] });
        })
      );
      await client.listTeams(true);
    });

    it('should create team', async () => {
      server.use(
        http.post(`${BASE_URL}/teams`, () => HttpResponse.json({ team: { id: 1, name: 'Growth' } }))
      );
      expect((await client.createTeam({ name: 'Growth' } as any)).name).toBe('Growth');
    });

    it('should archive team', async () => {
      server.use(http.put(`${BASE_URL}/teams/1/archive`, () => HttpResponse.json({ ok: true })));
      await client.archiveTeam(1);
    });

    it('should list team members', async () => {
      server.use(
        http.get(`${BASE_URL}/teams/1/members`, () => HttpResponse.json({ team_members: [{ id: 1, email: 'a@b.c' }] }))
      );
      expect(await client.listTeamMembers(1)).toHaveLength(1);
    });

    it('should add team members', async () => {
      server.use(
        http.put(`${BASE_URL}/teams/1/members/add`, () => HttpResponse.json({ ok: true, errors: [] }))
      );
      await client.addTeamMembers(1, [1, 2] as any, [1] as any);
    });

    it('should remove team members', async () => {
      server.use(
        http.put(`${BASE_URL}/teams/1/members/remove`, () => HttpResponse.json({ ok: true, errors: [] }))
      );
      await client.removeTeamMembers(1, [1] as any);
    });
  });

  describe('users CRUD', () => {
    it('should list users', async () => {
      server.use(
        http.get(`${BASE_URL}/users`, () => HttpResponse.json({ users: [{ id: 1, email: 'a@b.c' }] }))
      );
      expect(await client.listUsers()).toHaveLength(1);
    });

    it('should reset user password', async () => {
      server.use(
        http.put(`${BASE_URL}/users/1/reset-password`, () => HttpResponse.json({ ok: true, errors: [] }))
      );
      await client.resetUserPassword(1);
    });
  });

  describe('metrics CRUD', () => {
    it('should list metrics', async () => {
      server.use(
        http.get(`${BASE_URL}/metrics`, () => HttpResponse.json({ metrics: [{ id: 1, name: 'm1' }] }))
      );
      expect(await client.listMetrics()).toHaveLength(1);
    });

    it('should activate metric', async () => {
      server.use(
        http.put(`${BASE_URL}/metrics/1/activate`, () =>
          HttpResponse.json({ metric: { id: 1, name: 'm1' } })
        )
      );
      expect((await client.activateMetric(1, 'review')).id).toBe(1);
    });

    it('should archive metric', async () => {
      server.use(http.put(`${BASE_URL}/metrics/1/archive`, () => HttpResponse.json({ ok: true })));
      await client.archiveMetric(1);
    });
  });
});
