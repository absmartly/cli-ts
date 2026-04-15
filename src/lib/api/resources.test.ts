import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from './client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe('APIClient - Resources', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Goals', () => {
    let goalId: number;

    beforeAll(async () => {
      const goal = await client.createGoal({
        name: `test_goal_${Date.now()}`,
        description: 'Vitest goal',
      });
      goalId = goal.id;
    });

    it('should list goals with expected fields', async () => {
      const goals = await client.listGoals({ items: 10 });
      expect(Array.isArray(goals)).toBe(true);
      expect(goals.length).toBeGreaterThan(0);
      expect(goals[0]).toHaveProperty('id');
      expect(goals[0]).toHaveProperty('name');
    });

    it('should get goal by id and extract from wrapped response', async () => {
      const goal = await client.getGoal(goalId);
      expect(goal.id).toBe(goalId);
      expect(goal).toHaveProperty('name');
      expect(goal).not.toHaveProperty('goal');
    });

    it('should update goal and return unwrapped entity', async () => {
      const goal = await client.updateGoal(goalId, { description: 'Updated' });
      expect(goal.id).toBe(goalId);
      expect(goal).toHaveProperty('description');
      if (isLiveMode) expect(goal.description).toBe('Updated');
    });
  });

  describe('Segments', () => {
    let segmentId: number;

    beforeAll(async () => {
      const segment = await client.createSegment({
        name: `test_segment_${Date.now()}`,
        value_source_attribute: 'plan',
        description: 'Vitest segment',
      });
      segmentId = segment.id;
    });

    it('should list segments with expected fields', async () => {
      const segments = await client.listSegments({ items: 10 });
      expect(Array.isArray(segments)).toBe(true);
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0]).toHaveProperty('id');
      expect(segments[0]).toHaveProperty('name');
    });

    it('should get segment and extract from wrapped response', async () => {
      const segment = await client.getSegment(segmentId);
      expect(segment.id).toBe(segmentId);
      expect(segment).toHaveProperty('name');
    });
  });

  describe('Teams', () => {
    it('should list teams as an array', async () => {
      const teams = await client.listTeams();
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBeGreaterThan(0);
    });

    it('should get team by id and extract from wrapped response', async () => {
      const teams = await client.listTeams();
      const teamId = teams[0].id;
      const team = await client.getTeam(teamId);
      expect(team.id).toBe(teamId);
      expect(team).toHaveProperty('name');
    });

    it.skipIf(isLiveMode)('should pass include_archived param', async () => {
      let receivedParams: URLSearchParams | null = null;
      server.use(
        http.get(`${BASE_URL}/teams`, ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ teams: [] });
        })
      );

      await client.listTeams({ includeArchived: true });

      expect(receivedParams!.get('include_archived')).toBe('1');
    });

    it.skipIf(isLiveMode)('should archive team with correct body', async () => {
      let receivedBody: Record<string, unknown> | null = null;
      server.use(
        http.put(`${BASE_URL}/teams/:teamId/archive`, async ({ request }) => {
          receivedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ok: true, errors: [] });
        })
      );
      await client.archiveTeam(123);
      expect(receivedBody).toEqual({ archive: true });
    });
  });

  describe('Users', () => {
    it('should list users as an array', async () => {
      const users = await client.listUsers();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should get user by id and extract from wrapped response', async () => {
      const users = await client.listUsers();
      const userId = users[0].id;
      const user = await client.getUser(userId);
      expect(user.id).toBe(userId);
    });
  });

  describe('Metrics', () => {
    it('should list metrics with expected fields', async () => {
      const metrics = await client.listMetrics({ items: 10 });
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toHaveProperty('id');
      expect(metrics[0]).toHaveProperty('name');
    });

    it('should get metric and extract from wrapped response', async () => {
      const metrics = await client.listMetrics({ items: 1 });
      const metricId = metrics[0].id;
      const metric = await client.getMetric(metricId);
      expect(metric.id).toBe(metricId);
      expect(metric).toHaveProperty('name');
    });
  });

  describe('Applications', () => {
    it('should list applications with expected fields', async () => {
      const apps = await client.listApplications();
      expect(Array.isArray(apps)).toBe(true);
      expect(apps.length).toBeGreaterThan(0);
      expect(apps[0]).toHaveProperty('id');
      expect(apps[0]).toHaveProperty('name');
    });

    it('should get application and extract from wrapped response', async () => {
      const apps = await client.listApplications();
      const appId = apps[0].id;
      const app = await client.getApplication(appId);
      expect(app.id).toBe(appId);
      expect(app).toHaveProperty('name');
    });
  });

  describe('Environments', () => {
    it('should list environments with expected fields', async () => {
      const envs = await client.listEnvironments();
      expect(Array.isArray(envs)).toBe(true);
      expect(envs.length).toBeGreaterThan(0);
      expect(envs[0]).toHaveProperty('id');
      expect(envs[0]).toHaveProperty('name');
    });

    it('should get environment and extract from wrapped response', async () => {
      const envs = await client.listEnvironments();
      const envId = envs[0].id;
      const env = await client.getEnvironment(envId);
      expect(env.id).toBe(envId);
      expect(env).toHaveProperty('name');
    });
  });

  describe('Unit Types', () => {
    it('should list unit types with expected fields', async () => {
      const units = await client.listUnitTypes();
      expect(Array.isArray(units)).toBe(true);
      expect(units.length).toBeGreaterThan(0);
      expect(units[0]).toHaveProperty('id');
      expect(units[0]).toHaveProperty('name');
    });

    it('should get unit type and extract from wrapped response', async () => {
      const units = await client.listUnitTypes();
      const unitId = units[0].id;
      const unit = await client.getUnitType(unitId);
      expect(unit.id).toBe(unitId);
      expect(unit).toHaveProperty('name');
    });
  });

  describe('estimateMaxParticipants', () => {
    it('should return columnar response with expected columns', async () => {
      if (!isLiveMode) {
        server.use(
          http.post(`${BASE_URL}/experiments/estimate/max_participants`, () =>
            HttpResponse.json({
              columnNames: [
                'variant',
                'first_exposure_at',
                'last_exposure_at',
                'last_event_at',
                'unit_count',
              ],
              columnTypes: ['UInt8', 'Int64', 'Int64', 'Int64', 'UInt32'],
              rows: [[0, 1769812802910, 1774995544371, 0, 1945010]],
            })
          )
        );
      }

      const [apps, units] = await Promise.all([client.listApplications(), client.listUnitTypes()]);

      const result = await client.estimateMaxParticipants({
        from: Date.now() - 30 * 24 * 60 * 60 * 1000,
        unit_type_id: units[0].id,
        applications: [apps[0].id],
      });

      expect(result).toHaveProperty('columnNames');
      expect(result).toHaveProperty('rows');
      expect(Array.isArray(result.columnNames)).toBe(true);
      expect(Array.isArray(result.rows)).toBe(true);
      if (result.rows.length > 0) {
        expect(result.columnNames).toContain('unit_count');
      }
    });

    it('should work without applications parameter', async () => {
      if (!isLiveMode) {
        server.use(
          http.post(`${BASE_URL}/experiments/estimate/max_participants`, () =>
            HttpResponse.json({
              columnNames: [
                'variant',
                'first_exposure_at',
                'last_exposure_at',
                'last_event_at',
                'unit_count',
              ],
              columnTypes: ['UInt8', 'Int64', 'Int64', 'Int64', 'UInt32'],
              rows: [[0, 1769812802910, 1774995544371, 0, 500000]],
            })
          )
        );
      }

      const units = await client.listUnitTypes();

      const result = await client.estimateMaxParticipants({
        from: Date.now() - 30 * 24 * 60 * 60 * 1000,
        unit_type_id: units[0].id,
      });

      expect(Array.isArray(result.rows)).toBe(true);
      expect(Array.isArray(result.columnNames)).toBe(true);
    });

    it.skipIf(isLiveMode)('should throw on invalid response shape', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments/estimate/max_participants`, () =>
          HttpResponse.json({ error: 'bad request' })
        )
      );

      const units = await client.listUnitTypes();

      await expect(
        client.estimateMaxParticipants({
          from: Date.now(),
          unit_type_id: units[0].id,
        })
      ).rejects.toThrow(/columnNames/);
    });
  });
});
