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
  custom_section_field?: CustomSectionField;
}

export interface CustomSectionField {
  id: number;
  name: string;
  type: string;
}

export interface Experiment {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  type?: string;
  state?: string;
  application?: Application;
  applications?: ExperimentApplication[];
  unit_type?: UnitType;
  unit_type_id?: number;
  primary_metric_id?: number;
  variants?: Variant[];
  traffic?: number;
  percentages?: string;
  start_at?: string;
  stop_at?: string;
  created_at?: string;
  updated_at?: string;
  owner_id?: number;
  custom_field_values?: Record<string, string>;
  custom_section_field_values?: ExperimentCustomFieldValue[];
  alerts?: Alert[];
  notes?: Note[];
  teams?: Team[];
  tags?: ExperimentTag[];
}

export interface Variant {
  name: string;
  config?: unknown;
}

export interface Flag {
  id: number;
  key: string;
  name?: string;
  description?: string;
  application?: Application;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Goal {
  id: number;
  name: string;
  description?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Segment {
  id: number;
  name: string;
  description?: string;
  value_source_attribute?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Application {
  id: number;
  name: string;
}

export interface Environment {
  id: number;
  name: string;
  production?: boolean;
}

export interface UnitType {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  initials?: string;
  color?: string;
  description?: string;
  parent_team_id?: number;
  archived?: boolean;
  is_global_team?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  department?: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Metric {
  id: number;
  name: string;
  description?: string;
  version?: number;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExperimentTag {
  id: number;
  tag: string;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  default_user_role?: boolean;
  full_admin_role?: boolean;
  deletable?: boolean;
  editable?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Webhook {
  id: number;
  name: string;
  description?: string;
  url: string;
  enabled: boolean;
  ordered?: boolean;
  max_retries?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiKey {
  id: number;
  name: string;
  description?: string;
  hashed_key?: string;
  key_ending?: string;
  key?: string;
  permissions?: string;
  used_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  permission_category_id?: number;
}

export interface PermissionCategory {
  id: number;
  name: string;
  permissions?: Permission[];
}

export interface GoalTag {
  id: number;
  tag: string;
  created_at?: string;
  updated_at?: string;
}

export interface MetricTag {
  id: number;
  tag: string;
  created_at?: string;
  updated_at?: string;
}

export interface MetricCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Alert {
  id: number;
  type: string;
  dismissed?: boolean;
  created_at?: string;
}

export interface Note {
  id: number;
  text: string;
  action?: string;
  created_at?: string;
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
