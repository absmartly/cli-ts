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
} from '../api/branded-types.js';

function parseIdGeneric<T extends number>(value: string, typeName: string): T {
  const trimmed = value.trim();

  if (trimmed === '') {
    throw new Error(`Invalid ${typeName}: "${value}" must be a valid number`);
  }

  const id = Number(trimmed);

  if (!Number.isFinite(id)) {
    throw new Error(`Invalid ${typeName}: "${value}" must be a valid number`);
  }

  if (!Number.isInteger(id)) {
    throw new Error(`Invalid ${typeName}: "${value}" must be an integer (got ${id})`);
  }

  if (id.toString() !== trimmed) {
    throw new Error(
      `Invalid ${typeName}: "${value}" contains non-numeric characters\n` +
      `Expected a plain integer like "42", not "${value}"`
    );
  }

  if (id <= 0) {
    throw new Error(`Invalid ${typeName}: ${id} must be a positive integer`);
  }

  return id as T;
}

export function parseExperimentId(value: string): ExperimentId {
  return parseIdGeneric<ExperimentId>(value, 'ExperimentId');
}

export function parseGoalId(value: string): GoalId {
  return parseIdGeneric<GoalId>(value, 'GoalId');
}

export function parseSegmentId(value: string): SegmentId {
  return parseIdGeneric<SegmentId>(value, 'SegmentId');
}

export function parseTeamId(value: string): TeamId {
  return parseIdGeneric<TeamId>(value, 'TeamId');
}

export function parseUserId(value: string): UserId {
  return parseIdGeneric<UserId>(value, 'UserId');
}

export function parseMetricId(value: string): MetricId {
  return parseIdGeneric<MetricId>(value, 'MetricId');
}

export function parseApplicationId(value: string): ApplicationId {
  return parseIdGeneric<ApplicationId>(value, 'ApplicationId');
}

export function parseEnvironmentId(value: string): EnvironmentId {
  return parseIdGeneric<EnvironmentId>(value, 'EnvironmentId');
}

export function parseUnitTypeId(value: string): UnitTypeId {
  return parseIdGeneric<UnitTypeId>(value, 'UnitTypeId');
}

export function parseNoteId(value: string): NoteId {
  return parseIdGeneric<NoteId>(value, 'NoteId');
}

export function parseAlertId(value: string): AlertId {
  return parseIdGeneric<AlertId>(value, 'AlertId');
}

export function parseTagId(value: string): TagId {
  return parseIdGeneric<TagId>(value, 'TagId');
}

export function parseRoleId(value: string): RoleId {
  return parseIdGeneric<RoleId>(value, 'RoleId');
}

export function parseApiKeyId(value: string): ApiKeyId {
  return parseIdGeneric<ApiKeyId>(value, 'ApiKeyId');
}

export function parseWebhookId(value: string): WebhookId {
  return parseIdGeneric<WebhookId>(value, 'WebhookId');
}

export function parseScheduledActionId(value: string): ScheduledActionId {
  return parseIdGeneric<ScheduledActionId>(value, 'ScheduledActionId');
}

/** @deprecated Use specific type parser (e.g., parseExperimentId) */
export function parseId(value: string): number {
  return parseIdGeneric<number>(value, 'ID');
}

export function requireAtLeastOneField(
  data: Record<string, unknown>,
  fieldName = 'field'
): void {
  const providedFields = Object.keys(data).filter((key) => data[key] !== undefined);

  if (providedFields.length === 0) {
    throw new Error(
      `At least one ${fieldName} must be provided for update.\n` +
        `Use --help to see available options.`
    );
  }
}

export function validateJSON(jsonString: string, context = 'JSON'): unknown {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${context}: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}
