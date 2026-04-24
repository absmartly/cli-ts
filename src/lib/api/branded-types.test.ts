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
  Timestamp,
  TrafficPercentage,
  JSONConfig,
  ProfileName,
} from './branded-types.js';

describe('Branded ID Types', () => {
  describe('ExperimentId', () => {
    it('should accept valid positive integers', () => {
      expect(() => ExperimentId(1)).not.toThrow();
      expect(() => ExperimentId(999)).not.toThrow();
      expect(() => ExperimentId(1000000)).not.toThrow();
    });

    it('should reject zero', () => {
      expect(() => ExperimentId(0)).toThrow('must be a positive integer');
    });

    it('should reject negative numbers', () => {
      expect(() => ExperimentId(-1)).toThrow('must be a positive integer');
    });

    it('should reject non-integers', () => {
      expect(() => ExperimentId(1.5)).toThrow('must be an integer');
    });
  });

  describe('GoalId', () => {
    it('should accept valid positive integers', () => {
      expect(() => GoalId(1)).not.toThrow();
      expect(() => GoalId(123)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => GoalId(0)).toThrow();
      expect(() => GoalId(-5)).toThrow();
      expect(() => GoalId(2.5)).toThrow();
    });
  });

  describe('SegmentId', () => {
    it('should accept valid positive integers', () => {
      expect(() => SegmentId(1)).not.toThrow();
      expect(() => SegmentId(456)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => SegmentId(0)).toThrow();
      expect(() => SegmentId(-1)).toThrow();
    });
  });

  describe('TeamId', () => {
    it('should accept valid positive integers', () => {
      expect(() => TeamId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => TeamId(0)).toThrow();
    });
  });

  describe('UserId', () => {
    it('should accept valid positive integers', () => {
      expect(() => UserId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => UserId(-1)).toThrow();
    });
  });

  describe('MetricId', () => {
    it('should accept valid positive integers', () => {
      expect(() => MetricId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => MetricId(0)).toThrow();
    });
  });

  describe('ApplicationId', () => {
    it('should accept valid positive integers', () => {
      expect(() => ApplicationId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => ApplicationId(0)).toThrow();
    });
  });

  describe('EnvironmentId', () => {
    it('should accept valid positive integers', () => {
      expect(() => EnvironmentId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => EnvironmentId(0)).toThrow();
    });
  });

  describe('UnitTypeId', () => {
    it('should accept valid positive integers', () => {
      expect(() => UnitTypeId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => UnitTypeId(0)).toThrow();
    });
  });

  describe('NoteId', () => {
    it('should accept valid positive integers', () => {
      expect(() => NoteId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => NoteId(0)).toThrow();
    });
  });

  describe('AlertId', () => {
    it('should accept valid positive integers', () => {
      expect(() => AlertId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => AlertId(0)).toThrow();
    });
  });

  describe('TagId', () => {
    it('should accept valid positive integers', () => {
      expect(() => TagId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => TagId(0)).toThrow();
    });
  });

  describe('RoleId', () => {
    it('should accept valid positive integers', () => {
      expect(() => RoleId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => RoleId(0)).toThrow();
    });
  });

  describe('ApiKeyId', () => {
    it('should accept valid positive integers', () => {
      expect(() => ApiKeyId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => ApiKeyId(0)).toThrow();
    });
  });

  describe('WebhookId', () => {
    it('should accept valid positive integers', () => {
      expect(() => WebhookId(1)).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => WebhookId(0)).toThrow();
    });
  });
});

describe('Timestamp', () => {
  it('should accept valid timestamps', () => {
    expect(() => Timestamp(0)).not.toThrow();
    expect(() => Timestamp(1609459200000)).not.toThrow();
    expect(() => Timestamp(Date.now())).not.toThrow();
  });

  it('should reject negative timestamps', () => {
    expect(() => Timestamp(-1)).toThrow('must be a non-negative integer');
  });

  it('should reject non-integer timestamps', () => {
    expect(() => Timestamp(1234.5)).toThrow('must be a non-negative integer');
  });

  it('should reject unreasonably large timestamps', () => {
    expect(() => Timestamp(99999999999999)).toThrow('out of reasonable range');
  });
});

describe('TrafficPercentage', () => {
  it('should accept valid percentages', () => {
    expect(() => TrafficPercentage(0)).not.toThrow();
    expect(() => TrafficPercentage(50)).not.toThrow();
    expect(() => TrafficPercentage(100)).not.toThrow();
    expect(() => TrafficPercentage(33.33)).not.toThrow();
  });

  it('should reject values below 0', () => {
    expect(() => TrafficPercentage(-1)).toThrow('must be between 0 and 100');
  });

  it('should reject values above 100', () => {
    expect(() => TrafficPercentage(101)).toThrow('must be between 0 and 100');
  });

  it('should reject non-numbers', () => {
    expect(() => TrafficPercentage(NaN)).toThrow('must be a number');
  });
});

describe('JSONConfig', () => {
  it('should accept valid JSON objects', () => {
    expect(() => JSONConfig('{"key": "value"}')).not.toThrow();
    expect(() => JSONConfig('{"nested": {"key": 123}}')).not.toThrow();
  });

  it('should reject invalid JSON', () => {
    expect(() => JSONConfig('not json')).toThrow('Invalid JSONConfig');
    expect(() => JSONConfig('{invalid}')).toThrow('Invalid JSONConfig');
  });

  it('should reject JSON arrays', () => {
    expect(() => JSONConfig('[]')).toThrow('Config must be a JSON object');
    expect(() => JSONConfig('[1,2,3]')).toThrow('Config must be a JSON object');
  });

  it('should reject primitives', () => {
    expect(() => JSONConfig('"string"')).toThrow('Config must be a JSON object');
    expect(() => JSONConfig('123')).toThrow('Config must be a JSON object');
    expect(() => JSONConfig('null')).toThrow('Config must be a JSON object');
  });
});

describe('ProfileName', () => {
  it('should accept valid profile names', () => {
    expect(() => ProfileName('default')).not.toThrow();
    expect(() => ProfileName('production')).not.toThrow();
    expect(() => ProfileName('my-profile')).not.toThrow();
    expect(() => ProfileName('my_profile_123')).not.toThrow();
  });

  it('should trim whitespace', () => {
    const result = ProfileName('  production  ');
    expect(result).toBe('production');
  });

  it('should reject empty names', () => {
    expect(() => ProfileName('')).toThrow('cannot be empty');
    expect(() => ProfileName('   ')).toThrow('cannot be empty');
  });

  it('should reject invalid characters', () => {
    expect(() => ProfileName('my profile')).toThrow('Must contain only letters');
    expect(() => ProfileName('profile@123')).toThrow('Must contain only letters');
    expect(() => ProfileName('profile.name')).toThrow('Must contain only letters');
  });

  it('should reject names that are too long', () => {
    const longName = 'a'.repeat(51);
    expect(() => ProfileName(longName)).toThrow('too long');
  });

  it('should reject dangerous names', () => {
    expect(() => ProfileName('__proto__')).toThrow('Reserved profile name');
    expect(() => ProfileName('constructor')).toThrow('Reserved profile name');
    expect(() => ProfileName('prototype')).toThrow('Reserved profile name');
    expect(() => ProfileName('__PROTO__')).toThrow('Reserved profile name');
  });
});

describe('Type Safety (Compile-time)', () => {
  it('should prevent mixing ID types at compile time', () => {
    const expId = ExperimentId(1);
    const _goalId = GoalId(2);

    function takesExperimentId(id: ExperimentId) {
      return id;
    }

    expect(takesExperimentId(expId)).toBe(1);

    // This would fail at compile time (but we can't test that in runtime)
    // takesExperimentId(_goalId);
  });

  it('should allow branded types to be used as numbers', () => {
    const id = ExperimentId(42);

    expect(id).toBe(42);
    expect(typeof id).toBe('number');
    expect(id + 1).toBe(43);
  });
});
