import { describe, it, expect } from 'vitest';
import {
  applyShowExclude,
  summarizeMetric,
  summarizeMetricRow,
  summarizeGoal,
  summarizeGoalRow,
  summarizeTeam,
  summarizeTeamRow,
  summarizeUserRow,
  summarizeUserDetail,
  summarizeSegment,
  summarizeSegmentRow,
} from './entity-summary.js';

describe('applyShowExclude', () => {
  it('should add extra fields from raw data', () => {
    const summary = { id: 1, name: 'test' };
    const raw = { id: 1, name: 'test', extra: 'value' };
    const result = applyShowExclude(summary, raw, ['extra']);
    expect(result.extra).toBe('value');
  });

  it('should remove excluded fields', () => {
    const summary = { id: 1, name: 'test', description: 'desc' };
    const raw = { id: 1, name: 'test', description: 'desc' };
    const result = applyShowExclude(summary, raw, [], ['description']);
    expect(result).not.toHaveProperty('description');
  });

  it('should handle both show and exclude together', () => {
    const summary = { id: 1, name: 'test' };
    const raw = { id: 1, name: 'test', extra: 'value' };
    const result = applyShowExclude(summary, raw, ['extra'], ['name']);
    expect(result.extra).toBe('value');
    expect(result).not.toHaveProperty('name');
  });
});

describe('summarizeMetric', () => {
  it('should include key fields', () => {
    const result = summarizeMetric({
      id: 1,
      name: 'metric1',
      type: 'count',
      effect: 'positive',
      lifecycle_status: 'active',
      goal: { name: 'Revenue' },
      metric_category: { name: 'Business' },
      created_at: '2024-01-15T10:00:00Z',
    });
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'metric1');
    expect(result).toHaveProperty('type', 'count');
    expect(result).toHaveProperty('goal', 'Revenue');
    expect(result).toHaveProperty('category', 'Business');
  });
});

describe('summarizeMetricRow', () => {
  it('should include key row fields', () => {
    const result = summarizeMetricRow({
      id: 1,
      name: 'metric1',
      type: 'count',
      goal_id: 5,
    });
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'metric1');
    expect(result).toHaveProperty('type', 'count');
    expect(result).toHaveProperty('goal', 5);
  });
});

describe('summarizeGoal', () => {
  it('should include key fields', () => {
    const result = summarizeGoal({
      id: 2,
      name: 'Revenue',
      description: 'Revenue goal',
      created_at: '2024-02-01T00:00:00Z',
      archived: false,
    });
    expect(result).toHaveProperty('id', 2);
    expect(result).toHaveProperty('name', 'Revenue');
    expect(result).toHaveProperty('description', 'Revenue goal');
    expect(result).toHaveProperty('archived', false);
  });
});

describe('summarizeGoalRow', () => {
  it('should include key row fields', () => {
    const result = summarizeGoalRow({ id: 2, name: 'Revenue', archived: false });
    expect(result).toHaveProperty('id', 2);
    expect(result).toHaveProperty('name', 'Revenue');
    expect(result).toHaveProperty('archived', false);
  });
});

describe('summarizeTeam', () => {
  it('should include key fields', () => {
    const result = summarizeTeam({
      id: 3,
      name: 'Platform',
      initials: 'PT',
      description: 'Platform team',
      parent_team: { name: 'Engineering' },
      created_at: '2024-03-01T00:00:00Z',
      archived: false,
    });
    expect(result).toHaveProperty('id', 3);
    expect(result).toHaveProperty('name', 'Platform');
    expect(result).toHaveProperty('initials', 'PT');
    expect(result).toHaveProperty('parent', 'Engineering');
  });
});

describe('summarizeTeamRow', () => {
  it('should include key row fields', () => {
    const result = summarizeTeamRow({ id: 3, name: 'Platform', initials: 'PT', archived: false });
    expect(result).toHaveProperty('id', 3);
    expect(result).toHaveProperty('name', 'Platform');
    expect(result).toHaveProperty('archived', false);
  });
});

describe('summarizeUserRow', () => {
  it('should include key row fields', () => {
    const result = summarizeUserRow({
      id: 10,
      email: 'user@example.com',
      first_name: 'John',
      last_name: 'Doe',
      archived: false,
    });
    expect(result).toHaveProperty('id', 10);
    expect(result).toHaveProperty('email', 'user@example.com');
    expect(result).toHaveProperty('name', 'John Doe');
    expect(result).toHaveProperty('archived', false);
  });
});

describe('summarizeUserDetail', () => {
  it('should include key detail fields', () => {
    const result = summarizeUserDetail({
      id: 10,
      email: 'user@example.com',
      first_name: 'John',
      last_name: 'Doe',
      archived: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
    });
    expect(result).toHaveProperty('id', 10);
    expect(result).toHaveProperty('name', 'John Doe');
    expect(result).toHaveProperty('created_at');
    expect(result.created_at).toBeTruthy();
    expect(result).toHaveProperty('updated_at');
    expect(result.updated_at).toBeTruthy();
  });
});

describe('summarizeSegment', () => {
  it('should include key fields', () => {
    const result = summarizeSegment({
      id: 5,
      name: 'Mobile Users',
      description: 'Users on mobile',
      value_source_attribute: 'device',
      created_at: '2024-04-01T00:00:00Z',
      archived: false,
    });
    expect(result).toHaveProperty('id', 5);
    expect(result).toHaveProperty('name', 'Mobile Users');
    expect(result).toHaveProperty('attribute', 'device');
    expect(result).toHaveProperty('archived', false);
  });
});

describe('summarizeSegmentRow', () => {
  it('should include key row fields', () => {
    const result = summarizeSegmentRow({
      id: 5,
      name: 'Mobile Users',
      value_source_attribute: 'device',
      archived: false,
    });
    expect(result).toHaveProperty('id', 5);
    expect(result).toHaveProperty('name', 'Mobile Users');
    expect(result).toHaveProperty('attribute', 'device');
  });
});
