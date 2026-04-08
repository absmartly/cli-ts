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
  NotificationId,
  RecommendedActionId,
  CorsOriginId,
  DatasourceId,
  ExportConfigId,
  UpdateScheduleId,
} from '../../api-client/types.js';

function parseStringToPositiveInt(value: string, typeName: string): number {
  const trimmed = value.trim();

  if (trimmed === '') {
    throw new Error(`Invalid ${typeName}: value cannot be empty`);
  }

  const id = Number(trimmed);

  if (!Number.isFinite(id)) {
    throw new Error(`Invalid ${typeName}: "${value}" is not a valid number`);
  }

  if (id.toString() !== trimmed) {
    throw new Error(
      `Invalid ${typeName}: "${value}" contains non-numeric characters\n` +
      `Expected a plain integer like "42", not "${value}"`
    );
  }

  if (id <= 0) {
    throw new Error(`Invalid ${typeName}: value must be a positive integer, got ${id}`);
  }

  return id;
}

export function parseExperimentId(value: string): ExperimentId {
  return ExperimentId(parseStringToPositiveInt(value, 'ExperimentId'));
}

export function parseGoalId(value: string): GoalId {
  return GoalId(parseStringToPositiveInt(value, 'GoalId'));
}

export function parseSegmentId(value: string): SegmentId {
  return SegmentId(parseStringToPositiveInt(value, 'SegmentId'));
}

export function parseTeamId(value: string): TeamId {
  return TeamId(parseStringToPositiveInt(value, 'TeamId'));
}

export function parseUserId(value: string): UserId {
  return UserId(parseStringToPositiveInt(value, 'UserId'));
}

export function parseMetricId(value: string): MetricId {
  return MetricId(parseStringToPositiveInt(value, 'MetricId'));
}

export function parseApplicationId(value: string): ApplicationId {
  return ApplicationId(parseStringToPositiveInt(value, 'ApplicationId'));
}

export function parseEnvironmentId(value: string): EnvironmentId {
  return EnvironmentId(parseStringToPositiveInt(value, 'EnvironmentId'));
}

export function parseUnitTypeId(value: string): UnitTypeId {
  return UnitTypeId(parseStringToPositiveInt(value, 'UnitTypeId'));
}

export function parseNoteId(value: string): NoteId {
  return NoteId(parseStringToPositiveInt(value, 'NoteId'));
}

export function parseAlertId(value: string): AlertId {
  return AlertId(parseStringToPositiveInt(value, 'AlertId'));
}

export function parseTagId(value: string): TagId {
  return TagId(parseStringToPositiveInt(value, 'TagId'));
}

export function parseRoleId(value: string): RoleId {
  return RoleId(parseStringToPositiveInt(value, 'RoleId'));
}

export function parseApiKeyId(value: string): ApiKeyId {
  return ApiKeyId(parseStringToPositiveInt(value, 'ApiKeyId'));
}

export function parseWebhookId(value: string): WebhookId {
  return WebhookId(parseStringToPositiveInt(value, 'WebhookId'));
}

export function parseScheduledActionId(value: string): ScheduledActionId {
  return ScheduledActionId(parseStringToPositiveInt(value, 'ScheduledActionId'));
}

export function parseCustomSectionFieldId(value: string): CustomSectionFieldId {
  return CustomSectionFieldId(parseStringToPositiveInt(value, 'CustomSectionFieldId'));
}

export function parseCustomSectionId(value: string): CustomSectionId {
  return CustomSectionId(parseStringToPositiveInt(value, 'CustomSectionId'));
}

export function parseAnnotationId(value: string): AnnotationId {
  return AnnotationId(parseStringToPositiveInt(value, 'AnnotationId'));
}

export function parseAssetRoleId(value: string): AssetRoleId {
  return AssetRoleId(parseStringToPositiveInt(value, 'AssetRoleId'));
}

export function parseNotificationId(value: string): NotificationId {
  return NotificationId(parseStringToPositiveInt(value, 'NotificationId'));
}

export function parseRecommendedActionId(value: string): RecommendedActionId {
  return RecommendedActionId(parseStringToPositiveInt(value, 'RecommendedActionId'));
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

export function parseCorsOriginId(value: string): CorsOriginId {
  return CorsOriginId(parseStringToPositiveInt(value, 'CorsOriginId'));
}

export function parseDatasourceId(value: string): DatasourceId {
  return DatasourceId(parseStringToPositiveInt(value, 'DatasourceId'));
}

export function parseExportConfigId(value: string): ExportConfigId {
  return ExportConfigId(parseStringToPositiveInt(value, 'ExportConfigId'));
}

export function parseUpdateScheduleId(value: string): UpdateScheduleId {
  return UpdateScheduleId(parseStringToPositiveInt(value, 'UpdateScheduleId'));
}
