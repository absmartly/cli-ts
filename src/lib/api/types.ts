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
} from './openapi-types.js';
import type {
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
  RoleId,
  ApiKeyId,
  WebhookId,
} from './branded-types.js';

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
  experiment_custom_section_field_id: number;
  type: string;
  value: string;
  updated_at?: string;
  updated_by_user_id?: UserId;
}

export interface CustomSectionField {
  id: number;
  name: string;
  type: string;
}

export interface PermissionCategory {
  id: number;
  name: string;
  permissions?: Permission[];
}

export interface ListOptions {
  limit?: number;
  offset?: number;
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

export interface APIError extends Error {
  statusCode?: number;
  response?: unknown;
}
