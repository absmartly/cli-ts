import { describe, it, expect } from 'vitest';
import { createAPIClient } from './client.js';

describe('APIClient - Resources', () => {
  const client = createAPIClient('https://api.absmartly.com/v1', 'test-api-key');

  describe('Goals', () => {
    it('should list goals', async () => {
      const goals = await client.listGoals(10);
      expect(goals).toBeDefined();
      expect(Array.isArray(goals)).toBe(true);
    });

    it('should get goal by id', async () => {
      const goal = await client.getGoal(123);
      expect(goal).toBeDefined();
      expect(goal.id).toBe(123);
    });

    it('should create goal', async () => {
      const goal = await client.createGoal({ name: 'test_goal', type: 'conversion' });
      expect(goal).toBeDefined();
      expect(goal.id).toBeDefined();
    });

    it('should update goal', async () => {
      const goal = await client.updateGoal(123, { description: 'Updated' });
      expect(goal).toBeDefined();
    });

    it('should delete goal', async () => {
      await expect(client.deleteGoal(123)).resolves.not.toThrow();
    });
  });

  describe('Segments', () => {
    it('should list segments', async () => {
      const segments = await client.listSegments(10);
      expect(segments).toBeDefined();
      expect(Array.isArray(segments)).toBe(true);
    });

    it('should get segment', async () => {
      const segment = await client.getSegment(123);
      expect(segment).toBeDefined();
    });

    it('should create segment', async () => {
      const segment = await client.createSegment({ name: 'premium', value_source_attribute: 'plan' });
      expect(segment).toBeDefined();
    });
  });

  describe('Teams', () => {
    it('should list teams', async () => {
      const teams = await client.listTeams();
      expect(teams).toBeDefined();
      expect(Array.isArray(teams)).toBe(true);
    });

    it('should include archived teams', async () => {
      const teams = await client.listTeams(true);
      expect(teams).toBeDefined();
    });

    it('should get team', async () => {
      const team = await client.getTeam(123);
      expect(team).toBeDefined();
    });

    it('should archive team', async () => {
      const team = await client.archiveTeam(123);
      expect(team).toBeDefined();
    });
  });

  describe('Users', () => {
    it('should list users', async () => {
      const users = await client.listUsers();
      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
    });

    it('should get user', async () => {
      const user = await client.getUser(123);
      expect(user).toBeDefined();
    });

    it('should create user', async () => {
      const user = await client.createUser({ email: 'test@example.com', first_name: 'John', last_name: 'Doe' });
      expect(user).toBeDefined();
    });
  });

  describe('Metrics', () => {
    it('should list metrics', async () => {
      const metrics = await client.listMetrics(10);
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should get metric', async () => {
      const metric = await client.getMetric(123);
      expect(metric).toBeDefined();
    });
  });

  describe('Applications', () => {
    it('should list applications', async () => {
      const apps = await client.listApplications();
      expect(apps).toBeDefined();
      expect(Array.isArray(apps)).toBe(true);
    });

    it('should get application', async () => {
      const app = await client.getApplication(1);
      expect(app).toBeDefined();
    });
  });

  describe('Environments', () => {
    it('should list environments', async () => {
      const envs = await client.listEnvironments();
      expect(envs).toBeDefined();
      expect(Array.isArray(envs)).toBe(true);
    });

    it('should get environment', async () => {
      const env = await client.getEnvironment(1);
      expect(env).toBeDefined();
    });
  });

  describe('Unit Types', () => {
    it('should list unit types', async () => {
      const units = await client.listUnitTypes();
      expect(units).toBeDefined();
      expect(Array.isArray(units)).toBe(true);
    });

    it('should get unit type', async () => {
      const unit = await client.getUnitType(1);
      expect(unit).toBeDefined();
    });
  });
});
