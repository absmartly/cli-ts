import type {
  Experiment as OpenAPIExperiment,
  ExperimentShort as OpenAPIExperimentShort,
  ExperimentVariant as OpenAPIExperimentVariant,
  ExperimentNote as OpenAPIExperimentNote,
  ExperimentTag as OpenAPIExperimentTag,
  Goal as OpenAPIGoal,
  GoalTag as OpenAPIGoalTag,
  Segment as OpenAPISegment,
  Team as OpenAPITeam,
  User as OpenAPIUser,
  Metric as OpenAPIMetric,
  MetricTag as OpenAPIMetricTag,
  MetricCategory as OpenAPIMetricCategory,
  Application as OpenAPIApplication,
  Environment as OpenAPIEnvironment,
  UnitType as OpenAPIUnitType,
  ApiKey as OpenAPIApiKey,
  Role as OpenAPIRole,
  Permission as OpenAPIPermission,
  Webhook as OpenAPIWebhook,
} from '../lib/api/openapi-types.js';

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
export type ScheduledActionId = Branded<number, 'ScheduledActionId'>;
export type CustomSectionFieldId = Branded<number, 'CustomSectionFieldId'>;
export type CustomSectionId = Branded<number, 'CustomSectionId'>;
export type AnnotationId = Branded<number, 'AnnotationId'>;
export type AssetRoleId = Branded<number, 'AssetRoleId'>;
export type CorsOriginId = Branded<number, 'CorsOriginId'>;
export type DatasourceId = Branded<number, 'DatasourceId'>;
export type ExportConfigId = Branded<number, 'ExportConfigId'>;
export type UpdateScheduleId = Branded<number, 'UpdateScheduleId'>;

export type NotificationId = Branded<number, 'NotificationId'>;
export type RecommendedActionId = Branded<number, 'RecommendedActionId'>;
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

export function ScheduledActionId(id: number): ScheduledActionId {
  validatePositiveInteger(id, 'ScheduledActionId');
  return id as ScheduledActionId;
}

export function CustomSectionFieldId(id: number): CustomSectionFieldId {
  validatePositiveInteger(id, 'CustomSectionFieldId');
  return id as CustomSectionFieldId;
}

export function CustomSectionId(id: number): CustomSectionId {
  validatePositiveInteger(id, 'CustomSectionId');
  return id as CustomSectionId;
}

export function AnnotationId(id: number): AnnotationId {
  validatePositiveInteger(id, 'AnnotationId');
  return id as AnnotationId;
}

export function AssetRoleId(id: number): AssetRoleId {
  validatePositiveInteger(id, 'AssetRoleId');
  return id as AssetRoleId;
}
export function CorsOriginId(id: number): CorsOriginId {
  validatePositiveInteger(id, 'CorsOriginId');
  return id as CorsOriginId;
}

export function DatasourceId(id: number): DatasourceId {
  validatePositiveInteger(id, 'DatasourceId');
  return id as DatasourceId;
}

export function ExportConfigId(id: number): ExportConfigId {
  validatePositiveInteger(id, 'ExportConfigId');
  return id as ExportConfigId;
}

export function UpdateScheduleId(id: number): UpdateScheduleId {
  validatePositiveInteger(id, 'UpdateScheduleId');
  return id as UpdateScheduleId;
}


export function NotificationId(id: number): NotificationId {
  validatePositiveInteger(id, 'NotificationId');
  return id as NotificationId;
}

export function RecommendedActionId(id: number): RecommendedActionId {
  validatePositiveInteger(id, 'RecommendedActionId');
  return id as RecommendedActionId;
}

export function Timestamp(value: number): Timestamp {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid Timestamp: ${value} must be a non-negative integer`);
  }
  const MAX_REASONABLE_TIMESTAMP_MS = 32503680000000;
  if (value > MAX_REASONABLE_TIMESTAMP_MS) {
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

export type ExperimentStrict = OpenAPIExperiment;
export type ExperimentShortStrict = OpenAPIExperimentShort;
export type VariantStrict = OpenAPIExperimentVariant;
export type NoteStrict = OpenAPIExperimentNote;

export type Experiment = Partial<OpenAPIExperiment> & {
  id: ExperimentId;
  name: string;
  unit_type_id?: UnitTypeId;
  application_id?: ApplicationId;
  environment_id?: EnvironmentId;
  owner_id?: UserId;
  team_id?: TeamId;
};

export type ExperimentShort = Partial<OpenAPIExperimentShort> & {
  id: ExperimentId;
  name: string;
  unit_type_id?: UnitTypeId;
  application_id?: ApplicationId;
  owner_id?: UserId;
  team_id?: TeamId;
};

export type Variant = {
  name: string;
  config?: string | object;
  variant?: number;
  experiment_id?: ExperimentId;
};

export type Note = Partial<OpenAPIExperimentNote> & {
  id: NoteId;
  experiment_id?: ExperimentId;
  created_by_user_id?: UserId;
};

export type ExperimentTag = OpenAPIExperimentTag;

export type Goal = Partial<OpenAPIGoal> & {
  id: GoalId;
  name: string;
};

export type GoalTag = OpenAPIGoalTag;

export type Segment = Partial<OpenAPISegment> & {
  id: SegmentId;
  name: string;
};

export type Team = Partial<OpenAPITeam> & {
  id: TeamId;
  name: string;
};

export type User = Partial<OpenAPIUser> & {
  id: UserId;
  email: string;
};

export type Metric = Partial<OpenAPIMetric> & {
  id: MetricId;
  name: string;
  goal_id?: GoalId;
};

export type MetricTag = OpenAPIMetricTag;
export type MetricCategory = OpenAPIMetricCategory;

export type Application = Partial<OpenAPIApplication> & {
  id: ApplicationId;
  name: string;
};

export type Environment = Partial<OpenAPIEnvironment> & {
  id: EnvironmentId;
  name: string;
};

export type UnitType = Partial<OpenAPIUnitType> & {
  id: UnitTypeId;
  name: string;
};

export type ApiKey = Partial<OpenAPIApiKey> & {
  id: ApiKeyId;
};

export type Role = Partial<OpenAPIRole> & {
  id: RoleId;
  name: string;
};

export type Permission = OpenAPIPermission;
export type Webhook = Partial<OpenAPIWebhook> & {
  id: WebhookId;
};

export interface ScheduledAction {
  id: ScheduledActionId;
  experiment_id: ExperimentId;
  action: string;
  scheduled_at: string;
  note?: string;
  reason?: string;
  created_at?: string;
  executed_at?: string;
}

export interface Alert {
  id: AlertId;
  experiment_id?: ExperimentId;
  type: string;
  dismissed?: boolean;
  created_at?: string;
}

export interface ExperimentApplication {
  experiment_id?: ExperimentId;
  application_id: ApplicationId;
  application_version?: string;
  application?: Application;
}

export interface ExperimentCustomFieldValue {
  experiment_id?: ExperimentId;
  experiment_custom_section_field_id: CustomSectionFieldId;
  type: string;
  value: string;
  updated_at?: string;
  updated_by_user_id?: UserId;
}

export interface CustomSectionField {
  id: CustomSectionFieldId;
  name: string;
  type: string;
  default_value?: string;
  archived?: boolean;
  custom_section?: {
    type?: string;
    archived?: boolean;
  };
}

export interface AssetRole {
  id: AssetRoleId;
  name: string;
}

export interface PermissionCategory {
  id: number;
  name: string;
  permissions?: Permission[];
}

export interface ListOptions {
  page?: number;
  items?: number;
  sort?: string;
  ascending?: boolean;
  select?: string;
  include?: string;
  previews?: boolean;
  application?: string;
  status?: string;
  state?: string;
  type?: string;
  unit_types?: string;
  owners?: string;
  teams?: string;
  tags?: string;
  created_after?: number;
  created_before?: number;
  started_after?: number;
  started_before?: number;
  stopped_after?: number;
  stopped_before?: number;
  analysis_type?: string;
  running_type?: string;
  search?: string;
  alert_srm?: number;
  alert_cleanup_needed?: number;
  alert_audience_mismatch?: number;
  alert_sample_size_reached?: number;
  alert_experiments_interact?: number;
  alert_group_sequential_updated?: number;
  alert_assignment_conflict?: number;
  alert_metric_threshold_reached?: number;
  significance?: string;
}
