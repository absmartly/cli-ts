import { describe, it, expect } from 'vitest';
import {
  ExperimentId,
  GoalId,
  SegmentId,
  TeamId,
  UserId,
  MetricId,
  ApplicationId,
  EnvironmentId,
  UnitTypeId,
  NoteId,
  AlertId,
  TagId,
  RoleId,
  ApiKeyId,
  WebhookId,
  ScheduledActionId,
  CustomSectionFieldId,
  CustomSectionId,
  AnnotationId,
  AssetRoleId,
  CorsOriginId,
  DatasourceId,
  ExportConfigId,
  UpdateScheduleId,
  NotificationId,
  RecommendedActionId,
  Timestamp,
  TrafficPercentage,
  JSONConfig,
  ProfileName,
} from './types.js';

describe('branded ID constructors', () => {
  const constructors = [
    { fn: ExperimentId, name: 'ExperimentId' },
    { fn: GoalId, name: 'GoalId' },
    { fn: SegmentId, name: 'SegmentId' },
    { fn: TeamId, name: 'TeamId' },
    { fn: UserId, name: 'UserId' },
    { fn: MetricId, name: 'MetricId' },
    { fn: ApplicationId, name: 'ApplicationId' },
    { fn: EnvironmentId, name: 'EnvironmentId' },
    { fn: UnitTypeId, name: 'UnitTypeId' },
    { fn: NoteId, name: 'NoteId' },
    { fn: AlertId, name: 'AlertId' },
    { fn: TagId, name: 'TagId' },
    { fn: RoleId, name: 'RoleId' },
    { fn: ApiKeyId, name: 'ApiKeyId' },
    { fn: WebhookId, name: 'WebhookId' },
    { fn: ScheduledActionId, name: 'ScheduledActionId' },
    { fn: CustomSectionFieldId, name: 'CustomSectionFieldId' },
    { fn: CustomSectionId, name: 'CustomSectionId' },
    { fn: AnnotationId, name: 'AnnotationId' },
    { fn: AssetRoleId, name: 'AssetRoleId' },
    { fn: CorsOriginId, name: 'CorsOriginId' },
    { fn: DatasourceId, name: 'DatasourceId' },
    { fn: ExportConfigId, name: 'ExportConfigId' },
    { fn: UpdateScheduleId, name: 'UpdateScheduleId' },
    { fn: NotificationId, name: 'NotificationId' },
    { fn: RecommendedActionId, name: 'RecommendedActionId' },
  ];

  for (const { fn, name } of constructors) {
    it(`${name} should accept positive integer`, () => {
      expect(fn(1)).toBe(1);
      expect(fn(42)).toBe(42);
    });

    it(`${name} should reject zero`, () => {
      expect(() => fn(0)).toThrow(/positive integer/);
    });

    it(`${name} should reject negative`, () => {
      expect(() => fn(-1)).toThrow(/positive integer/);
    });

    it(`${name} should reject non-integer`, () => {
      expect(() => fn(1.5)).toThrow(/integer/);
    });
  }
});

describe('Timestamp', () => {
  it('should accept valid timestamps', () => {
    expect(Timestamp(0)).toBe(0);
    expect(Timestamp(1704067200000)).toBe(1704067200000);
  });

  it('should reject negative', () => {
    expect(() => Timestamp(-1)).toThrow(/non-negative/);
  });

  it('should reject unreasonably large values', () => {
    expect(() => Timestamp(999999999999999)).toThrow(/reasonable range/);
  });
});

describe('TrafficPercentage', () => {
  it('should accept 0-100', () => {
    expect(TrafficPercentage(0)).toBe(0);
    expect(TrafficPercentage(50)).toBe(50);
    expect(TrafficPercentage(100)).toBe(100);
  });

  it('should reject out of range', () => {
    expect(() => TrafficPercentage(-1)).toThrow(/between 0 and 100/);
    expect(() => TrafficPercentage(101)).toThrow(/between 0 and 100/);
  });

  it('should reject NaN', () => {
    expect(() => TrafficPercentage(NaN)).toThrow(/must be a number/);
  });
});

describe('JSONConfig', () => {
  it('should accept valid JSON objects', () => {
    expect(JSONConfig('{"a":1}')).toBe('{"a":1}');
  });

  it('should reject non-object JSON', () => {
    expect(() => JSONConfig('"string"')).toThrow(/must be a JSON object/);
    expect(() => JSONConfig('[1,2]')).toThrow(/must be a JSON object/);
    expect(() => JSONConfig('null')).toThrow(/must be a JSON object/);
  });

  it('should reject invalid JSON', () => {
    expect(() => JSONConfig('not-json')).toThrow(/Invalid JSONConfig/);
  });
});

describe('ProfileName', () => {
  it('should accept valid names', () => {
    expect(ProfileName('default')).toBe('default');
    expect(ProfileName('my-profile')).toBe('my-profile');
    expect(ProfileName('prod_v2')).toBe('prod_v2');
  });

  it('should reject empty', () => {
    expect(() => ProfileName('')).toThrow(/cannot be empty/);
    expect(() => ProfileName('   ')).toThrow(/cannot be empty/);
  });

  it('should reject invalid characters', () => {
    expect(() => ProfileName('my profile')).toThrow(/Must contain only/);
    expect(() => ProfileName('name@special')).toThrow(/Must contain only/);
  });

  it('should reject too long', () => {
    expect(() => ProfileName('a'.repeat(51))).toThrow(/too long/);
  });

  it('should reject reserved names', () => {
    expect(() => ProfileName('__proto__')).toThrow(/Reserved/);
    expect(() => ProfileName('constructor')).toThrow(/Reserved/);
    expect(() => ProfileName('prototype')).toThrow(/Reserved/);
  });

  it('should trim input', () => {
    expect(ProfileName('  test  ')).toBe('test');
  });
});
