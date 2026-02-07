/**
 * Branded types for type-safe IDs
 * Prevents mixing different ID types (e.g., ExperimentId vs GoalId)
 */

type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

export type ExperimentId = Branded<number, 'ExperimentId'>;
export type GoalId = Branded<number, 'GoalId'>;
export type SegmentId = Branded<number, 'SegmentId'>;
export type TeamId = Branded<number, 'TeamId'>;
export type UserId = Branded<number, 'UserId'>;
export type MetricId = Branded<number, 'MetricId'>;
export type ApplicationId = Branded<number, 'ApplicationId'>;
export type EnvironmentId = Branded<number, 'EnvironmentId'>;
export type UnitTypeId = Branded<number, 'UnitTypeId'>;
export type NoteId = Branded<number, 'NoteId'>;
export type AlertId = Branded<number, 'AlertId'>;
export type TagId = Branded<number, 'TagId'>;
export type RoleId = Branded<number, 'RoleId'>;
export type ApiKeyId = Branded<number, 'ApiKeyId'>;
export type WebhookId = Branded<number, 'WebhookId'>;

export type Timestamp = Branded<number, 'Timestamp'>;
export type TrafficPercentage = Branded<number, 'TrafficPercentage'>;
export type JSONConfig = Branded<string, 'JSONConfig'>;
export type ProfileName = Branded<string, 'ProfileName'>;
export type APIKey = Branded<string, 'APIKey'>;

function validatePositiveInteger(value: number, typeName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid ${typeName}: ${value} must be an integer`);
  }
  if (value <= 0) {
    throw new Error(`Invalid ${typeName}: ${value} must be a positive integer`);
  }
}

export function ExperimentId(id: number): ExperimentId {
  validatePositiveInteger(id, 'ExperimentId');
  return id as ExperimentId;
}

export function GoalId(id: number): GoalId {
  validatePositiveInteger(id, 'GoalId');
  return id as GoalId;
}

export function SegmentId(id: number): SegmentId {
  validatePositiveInteger(id, 'SegmentId');
  return id as SegmentId;
}

export function TeamId(id: number): TeamId {
  validatePositiveInteger(id, 'TeamId');
  return id as TeamId;
}

export function UserId(id: number): UserId {
  validatePositiveInteger(id, 'UserId');
  return id as UserId;
}

export function MetricId(id: number): MetricId {
  validatePositiveInteger(id, 'MetricId');
  return id as MetricId;
}

export function ApplicationId(id: number): ApplicationId {
  validatePositiveInteger(id, 'ApplicationId');
  return id as ApplicationId;
}

export function EnvironmentId(id: number): EnvironmentId {
  validatePositiveInteger(id, 'EnvironmentId');
  return id as EnvironmentId;
}

export function UnitTypeId(id: number): UnitTypeId {
  validatePositiveInteger(id, 'UnitTypeId');
  return id as UnitTypeId;
}

export function NoteId(id: number): NoteId {
  validatePositiveInteger(id, 'NoteId');
  return id as NoteId;
}

export function AlertId(id: number): AlertId {
  validatePositiveInteger(id, 'AlertId');
  return id as AlertId;
}

export function TagId(id: number): TagId {
  validatePositiveInteger(id, 'TagId');
  return id as TagId;
}

export function RoleId(id: number): RoleId {
  validatePositiveInteger(id, 'RoleId');
  return id as RoleId;
}

export function ApiKeyId(id: number): ApiKeyId {
  validatePositiveInteger(id, 'ApiKeyId');
  return id as ApiKeyId;
}

export function WebhookId(id: number): WebhookId {
  validatePositiveInteger(id, 'WebhookId');
  return id as WebhookId;
}

export function Timestamp(value: number): Timestamp {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid Timestamp: ${value} must be a non-negative integer`);
  }
  if (value > 32503680000000) {
    throw new Error(`Timestamp out of reasonable range: ${value}`);
  }
  return value as Timestamp;
}

export function TrafficPercentage(value: number): TrafficPercentage {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`Invalid TrafficPercentage: ${value} must be a number`);
  }
  if (value < 0 || value > 100) {
    throw new Error(`Invalid TrafficPercentage: ${value} must be between 0 and 100`);
  }
  return value as TrafficPercentage;
}

export function JSONConfig(value: string): JSONConfig {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Config must be a JSON object');
    }
    return value as JSONConfig;
  } catch (error) {
    throw new Error(
      `Invalid JSONConfig: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

const VALID_PROFILE_NAME = /^[a-zA-Z0-9_-]+$/;

export function ProfileName(name: string): ProfileName {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error('Profile name cannot be empty');
  }

  if (!VALID_PROFILE_NAME.test(trimmed)) {
    throw new Error(
      `Invalid profile name: "${name}". Must contain only letters, numbers, hyphens, and underscores.`
    );
  }

  if (trimmed.length > 50) {
    throw new Error(`Profile name too long: ${trimmed.length} characters (max 50)`);
  }

  const dangerous = ['__proto__', 'constructor', 'prototype'];
  if (dangerous.includes(trimmed.toLowerCase())) {
    throw new Error(`Reserved profile name: ${trimmed}`);
  }

  return trimmed as ProfileName;
}

export function APIKeyValue(key: string): APIKey {
  const trimmed = key.trim();

  if (trimmed.length === 0) {
    throw new Error('API key cannot be empty');
  }

  if (trimmed.length < 20) {
    throw new Error('API key appears too short to be valid');
  }

  const testPatterns = ['test', 'example', 'dummy', 'fake', 'xxx'];
  if (testPatterns.some(pattern => trimmed.toLowerCase().includes(pattern))) {
    console.warn('Warning: API key appears to be a test key');
  }

  return trimmed as APIKey;
}
