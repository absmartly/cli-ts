/**
 * API Types for ABSmartly CLI
 *
 * These types are mapped from the OpenAPI specification for easier use
 * in the CLI. For the complete OpenAPI types, see openapi-types.ts
 */

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

// Re-export OpenAPI types for strict type checking when needed
export type ExperimentStrict = OpenAPIExperiment;
export type ExperimentShortStrict = OpenAPIExperimentShort;
export type VariantStrict = OpenAPIExperimentVariant;
export type NoteStrict = OpenAPIExperimentNote;

// Simplified types for CLI use (partial OpenAPI types with required fields)
export type Experiment = Partial<OpenAPIExperiment> & { id: number; name: string };
export type ExperimentShort = Partial<OpenAPIExperimentShort> & { id: number; name: string };
export type Variant = {
  name: string;
  config?: string | object;
  variant?: number;
  experiment_id?: number;
};
export type Note = Partial<OpenAPIExperimentNote> & { id: number };
export type ExperimentTag = OpenAPIExperimentTag;
export type Goal = OpenAPIGoal;
export type GoalTag = OpenAPIGoalTag;
export type Segment = OpenAPISegment;
export type Team = OpenAPITeam;
export type User = OpenAPIUser;
export type Metric = OpenAPIMetric;
export type MetricTag = OpenAPIMetricTag;
export type MetricCategory = OpenAPIMetricCategory;
export type Application = OpenAPIApplication;
export type Environment = OpenAPIEnvironment;
export type UnitType = OpenAPIUnitType;
export type ApiKey = OpenAPIApiKey;
export type Role = OpenAPIRole;
export type Permission = OpenAPIPermission;
export type Webhook = OpenAPIWebhook;

// Simplified types for common use
export interface Alert {
  id: number;
  type: string;
  dismissed?: boolean;
  created_at?: string;
}

export interface ExperimentApplication {
  experiment_id?: number;
  application_id: number;
  application_version?: string;
  application?: Application;
}

export interface ExperimentCustomFieldValue {
  experiment_id?: number;
  experiment_custom_section_field_id: number;
  type: string;
  value: string;
  updated_at?: string;
  updated_by_user_id?: number;
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

// List options for API queries
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

// API Error type
export interface APIError extends Error {
  statusCode?: number;
  response?: unknown;
}
