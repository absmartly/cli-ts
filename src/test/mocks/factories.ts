import { faker } from '@faker-js/faker';
import type { Experiment, Goal, Segment, Team, User, Metric, Application, Environment, UnitType, ExperimentTag, GoalTag, MetricTag, MetricCategory, Role, Permission, ApiKey, Webhook, Alert, Note } from '../../lib/api/types.js';

export function createMockExperiment(overrides?: Partial<Experiment>): Experiment {
  return {
    id: faker.number.int({ min: 1, max: 10000 }) as any,
    name: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
    display_name: faker.commerce.productName(),
    type: faker.helpers.arrayElement(['test', 'feature']) as 'test' | 'feature',
    state: faker.helpers.arrayElement(['created', 'ready', 'running', 'stopped', 'archived']) as 'created' | 'ready' | 'running' | 'stopped' | 'archived',
    unit_type_id: faker.number.int({ min: 1, max: 10 }) as any,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    variants: [
      { name: 'control', variant: 0, config: JSON.stringify({ description: 'Control variant' }) },
      { name: 'treatment', variant: 1, config: JSON.stringify({ description: 'Treatment variant' }) },
    ],
    ...overrides,
  };
}

export function createMockExperiments(count: number): Experiment[] {
  return Array.from({ length: count }, () => createMockExperiment());
}

export function createMockGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    name: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
    description: faker.lorem.sentence(),
    archived: false,
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as Goal;
}

export function createMockGoals(count: number): Goal[] {
  return Array.from({ length: count }, () => createMockGoal());
}

export function createMockSegment(overrides?: Partial<Segment>): Segment {
  return {
    id: faker.number.int({ min: 1, max: 10000 }) as any,
    name: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
    archived: false,
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as Segment;
}

export function createMockSegments(count: number): Segment[] {
  return Array.from({ length: count }, () => createMockSegment());
}

export function createMockTeam(overrides?: Partial<Team>): Team {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    name: faker.company.buzzNoun(),
    initials: faker.string.alpha({ length: 2, casing: 'upper' }),
    archived: false,
    is_global_team: false,
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as Team;
}

export function createMockTeams(count: number): Team[] {
  return Array.from({ length: count }, () => createMockTeam());
}

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: faker.number.int({ min: 1, max: 10000 }) as any,
    email: faker.internet.email(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    archived: false,
    created_at: faker.date.past().toISOString(),
    created_by: {
      email: faker.internet.email(),
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
    },
    ...overrides,
  } as User;
}

export function createMockUsers(count: number): User[] {
  return Array.from({ length: count }, () => createMockUser());
}

export function createMockMetric(overrides?: Partial<Metric>): Metric {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    name: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
    ...overrides,
  } as Metric;
}

export function createMockMetrics(count: number): Metric[] {
  return Array.from({ length: count }, () => createMockMetric());
}

export function createMockApplication(overrides?: Partial<Application>): Application {
  return {
    id: faker.number.int({ min: 1, max: 100 }),
    name: faker.helpers.arrayElement(['website', 'mobile', 'api']),
    created_at: faker.date.past().toISOString(),
    created_by: {
      email: faker.internet.email(),
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
    },
    archived: false,
    ...overrides,
  } as Application;
}

export function createMockApplications(count: number): Application[] {
  return Array.from({ length: count }, () => createMockApplication());
}

export function createMockEnvironment(overrides?: Partial<Environment>): Environment {
  return {
    id: faker.number.int({ min: 1, max: 10 }),
    name: faker.helpers.arrayElement(['production', 'staging', 'development']),
    description: faker.lorem.sentence(),
    type: 'production',
    archived: false,
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as Environment;
}

export function createMockEnvironments(count: number): Environment[] {
  return Array.from({ length: count }, () => createMockEnvironment());
}

export function createMockUnitType(overrides?: Partial<UnitType>): UnitType {
  return {
    id: faker.number.int({ min: 1, max: 10 }),
    name: faker.helpers.arrayElement(['user_id', 'session_id', 'anonymous_id']),
    description: faker.lorem.sentence(),
    archived: false,
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as UnitType;
}

export function createMockUnitTypes(count: number): UnitType[] {
  return Array.from({ length: count }, () => createMockUnitType());
}

export function createMockExperimentTag(overrides?: Partial<ExperimentTag>): ExperimentTag {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    tag: faker.word.words(2),
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as ExperimentTag;
}

export function createMockExperimentTags(count: number): ExperimentTag[] {
  return Array.from({ length: count }, () => createMockExperimentTag());
}

export function createMockGoalTag(overrides?: Partial<GoalTag>): GoalTag {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    tag: faker.word.words(2),
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as GoalTag;
}

export function createMockGoalTags(count: number): GoalTag[] {
  return Array.from({ length: count }, () => createMockGoalTag());
}

export function createMockMetricTag(overrides?: Partial<MetricTag>): MetricTag {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    tag: faker.word.words(2),
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as MetricTag;
}

export function createMockMetricTags(count: number): MetricTag[] {
  return Array.from({ length: count }, () => createMockMetricTag());
}

export function createMockMetricCategory(overrides?: Partial<MetricCategory>): MetricCategory {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    name: faker.word.words(2),
    archived: false,
    created_at: faker.date.past().toISOString() || null,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) || null,
    ...overrides,
  } as MetricCategory;
}

export function createMockMetricCategories(count: number): MetricCategory[] {
  return Array.from({ length: count }, () => createMockMetricCategory());
}

export function createMockRole(overrides?: Partial<Role>): Role {
  return {
    id: faker.number.int({ min: 1, max: 100 }),
    name: faker.helpers.arrayElement(['Admin', 'Editor', 'Viewer']),
    created_at: faker.date.past().toISOString(),
    created_by: {
      email: faker.internet.email(),
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
    },
    ...overrides,
  } as Role;
}

export function createMockRoles(count: number): Role[] {
  return Array.from({ length: count }, () => createMockRole());
}

export function createMockPermission(overrides?: Partial<Permission>): Permission {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    name: faker.word.words(3),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  } as Permission;
}

export function createMockPermissions(count: number): Permission[] {
  return Array.from({ length: count }, () => createMockPermission());
}

export function createMockApiKey(overrides?: Partial<ApiKey>): ApiKey {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    name: faker.word.words(2),
    key_ending: faker.string.alphanumeric(4),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    created_by_user_id: faker.number.int({ min: 1, max: 100 }),
    ...overrides,
  } as ApiKey;
}

export function createMockApiKeys(count: number): ApiKey[] {
  return Array.from({ length: count }, () => createMockApiKey());
}

export function createMockWebhook(overrides?: Partial<Webhook>): Webhook {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    name: faker.word.words(2),
    url: faker.internet.url(),
    enabled: faker.datatype.boolean(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  } as Webhook;
}

export function createMockWebhooks(count: number): Webhook[] {
  return Array.from({ length: count }, () => createMockWebhook());
}

export function createMockAlert(overrides?: Partial<Alert>): Alert {
  return {
    id: faker.number.int({ min: 1, max: 1000 }) as any,
    type: faker.helpers.arrayElement(['sample_ratio_mismatch', 'cleanup_needed', 'audience_mismatch']),
    dismissed: faker.datatype.boolean(),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createMockAlerts(count: number): Alert[] {
  return Array.from({ length: count }, () => createMockAlert());
}

export function createMockNote(overrides?: Partial<Note>): Note {
  return {
    id: faker.number.int({ min: 1, max: 1000 }) as any,
    text: faker.lorem.sentence(),
    action: faker.helpers.arrayElement(['archive', 'start', 'stop', 'create', 'ready', 'development', 'full_on', 'edit', 'comment']),
    created_at: faker.date.past().toISOString(),
    experiment_id: faker.number.int({ min: 1, max: 1000 }) as any,
    created_by_user_id: faker.number.int({ min: 1, max: 100 }) as any,
    ...overrides,
  } as Note;
}

export function createMockNotes(count: number): Note[] {
  return Array.from({ length: count }, () => createMockNote());
}
