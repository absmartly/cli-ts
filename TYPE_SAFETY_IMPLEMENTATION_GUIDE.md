# Type Safety Implementation Guide

**Target Codebase:** `/Users/joalves/git_tree/absmartly-cli-ts`
**Date:** 2026-02-06

This guide provides **ready-to-use code** for implementing the type safety improvements identified in the analysis.

---

## Quick Reference: What to Implement

| Priority | What | Where | Effort | Impact |
|----------|------|-------|--------|--------|
| 🔴 CRITICAL | Branded ID Types | `src/lib/api/branded-types.ts` | 2h | Very High |
| 🔴 CRITICAL | Read/Create/Update Types | `src/lib/api/types.ts` | 4h | Very High |
| 🔴 CRITICAL | Literal Union Enums | `src/lib/api/types.ts` | 1h | High |
| 🟡 HIGH | Type Guards | `src/lib/api/type-guards.ts` | 2h | Medium |
| 🟡 HIGH | Zod Schemas | `src/lib/api/schemas.ts` | 6h | High |
| 🟢 MEDIUM | Discriminated Unions | `src/lib/api/types.ts` | 3h | Medium |
| 🟢 MEDIUM | Phantom State Types | `src/lib/api/state-machine.ts` | 4h | Low-Medium |

---

## Implementation 1: Branded ID Types

**File:** `src/lib/api/branded-types.ts` (NEW)

```typescript
/**
 * Branded types for type-safe IDs
 * Prevents mixing different ID types (e.g., ExperimentId vs GoalId)
 */

// Base branded type
type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

// ID types
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

// Other branded types
export type Timestamp = Branded<number, 'Timestamp'>;
export type TrafficPercentage = Branded<number, 'TrafficPercentage'>;
export type JSONConfig = Branded<string, 'JSONConfig'>;
export type ProfileName = Branded<string, 'ProfileName'>;
export type APIKey = Branded<string, 'APIKey'>;

// Validation helper
function validatePositiveInteger(value: number, typeName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid ${typeName}: ${value} must be an integer`);
  }
  if (value <= 0) {
    throw new Error(`Invalid ${typeName}: ${value} must be a positive integer`);
  }
}

// ID constructors with validation
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

// Timestamp constructor
export function Timestamp(value: number): Timestamp {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid Timestamp: ${value} must be a non-negative integer`);
  }
  // Sanity check: reject unreasonable timestamps (before Unix epoch or after year 3000)
  if (value > 32503680000000) {
    throw new Error(`Timestamp out of reasonable range: ${value}`);
  }
  return value as Timestamp;
}

// Traffic percentage (0-100)
export function TrafficPercentage(value: number): TrafficPercentage {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`Invalid TrafficPercentage: ${value} must be a number`);
  }
  if (value < 0 || value > 100) {
    throw new Error(`Invalid TrafficPercentage: ${value} must be between 0 and 100`);
  }
  return value as TrafficPercentage;
}

// JSON config validation
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

// Profile name validation
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

  // Prevent dangerous names
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  if (dangerous.includes(trimmed.toLowerCase())) {
    throw new Error(`Reserved profile name: ${trimmed}`);
  }

  return trimmed as ProfileName;
}

// API key validation
export function APIKeyValue(key: string): APIKey {
  const trimmed = key.trim();

  if (trimmed.length === 0) {
    throw new Error('API key cannot be empty');
  }

  if (trimmed.length < 20) {
    throw new Error('API key appears too short to be valid');
  }

  // Warn about test keys
  const testPatterns = ['test', 'example', 'dummy', 'fake', 'xxx'];
  if (testPatterns.some(pattern => trimmed.toLowerCase().includes(pattern))) {
    console.warn('Warning: API key appears to be a test key');
  }

  return trimmed as APIKey;
}
```

---

## Implementation 2: Update Validators

**File:** `src/lib/utils/validators.ts` (UPDATE)

```typescript
/**
 * Common validation functions for CLI inputs
 */

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
} from '../api/branded-types.js';

/**
 * Generic ID parser
 */
function parseIdGeneric<T extends number>(value: string, typeName: string): T {
  const id = parseInt(value, 10);

  if (isNaN(id)) {
    throw new Error(`Invalid ${typeName}: "${value}" must be a number`);
  }

  if (id <= 0) {
    throw new Error(`Invalid ${typeName}: ${id} must be a positive integer`);
  }

  if (!Number.isInteger(id)) {
    throw new Error(`Invalid ${typeName}: ${id} must be an integer`);
  }

  return id as T;
}

/**
 * Type-safe ID parsers
 */
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

// Keep legacy parseId for backward compatibility (deprecated)
/** @deprecated Use specific type parser (e.g., parseExperimentId) */
export function parseId(value: string): number {
  return parseIdGeneric<number>(value, 'ID');
}

/**
 * Validate that at least one field is provided in an update object
 * @throws Error if object is empty
 */
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

/**
 * Validate JSON string
 * @throws Error with helpful message if JSON is invalid
 */
export function validateJSON(jsonString: string, context = 'JSON'): unknown {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${context}: ${error instanceof Error ? error.message : 'unknown error'}\n` +
        `\n` +
        `Input: ${jsonString.substring(0, 100)}${jsonString.length > 100 ? '...' : ''}`
    );
  }
}
```

---

## Implementation 3: Type Guards

**File:** `src/lib/api/type-guards.ts` (NEW)

```typescript
/**
 * Type guards for runtime type checking
 */

import type {
  Experiment,
  Goal,
  Segment,
  Team,
  User,
  Metric,
  ExperimentType,
  ExperimentState,
  GoalType,
} from './types.js';

/**
 * Object type guard
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Experiment type guards
 */
export function isExperimentType(value: unknown): value is ExperimentType {
  return value === 'test' || value === 'feature';
}

export function isExperimentState(value: unknown): value is ExperimentState {
  return (
    value === 'created' ||
    value === 'ready' ||
    value === 'running' ||
    value === 'stopped' ||
    value === 'archived'
  );
}

export function isExperiment(value: unknown): value is Experiment {
  if (!isObject(value)) return false;

  return (
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'type' in value &&
    isExperimentType(value.type) &&
    'state' in value &&
    isExperimentState(value.state)
  );
}

export function isExperimentArray(value: unknown): value is Experiment[] {
  return Array.isArray(value) && value.every(isExperiment);
}

/**
 * Goal type guards
 */
export function isGoalType(value: unknown): value is GoalType {
  return (
    value === 'conversion' ||
    value === 'revenue' ||
    value === 'count' ||
    value === 'custom'
  );
}

export function isGoal(value: unknown): value is Goal {
  if (!isObject(value)) return false;

  return (
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

export function isGoalArray(value: unknown): value is Goal[] {
  return Array.isArray(value) && value.every(isGoal);
}

/**
 * Segment type guard
 */
export function isSegment(value: unknown): value is Segment {
  if (!isObject(value)) return false;

  return (
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

export function isSegmentArray(value: unknown): value is Segment[] {
  return Array.isArray(value) && value.every(isSegment);
}

/**
 * Team type guard
 */
export function isTeam(value: unknown): value is Team {
  if (!isObject(value)) return false;

  return (
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

export function isTeamArray(value: unknown): value is Team[] {
  return Array.isArray(value) && value.every(isTeam);
}

/**
 * User type guard
 */
export function isUser(value: unknown): value is User {
  if (!isObject(value)) return false;

  return (
    'id' in value &&
    typeof value.id === 'number' &&
    'email' in value &&
    typeof value.email === 'string'
  );
}

export function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every(isUser);
}

/**
 * Metric type guard
 */
export function isMetric(value: unknown): value is Metric {
  if (!isObject(value)) return false;

  return (
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

export function isMetricArray(value: unknown): value is Metric[] {
  return Array.isArray(value) && value.every(isMetric);
}

/**
 * State-specific type guards for experiments
 */
export function isCreated(exp: Experiment): exp is Experiment & { state: 'created' } {
  return exp.state === 'created';
}

export function isReady(exp: Experiment): exp is Experiment & { state: 'ready' } {
  return exp.state === 'ready';
}

export function isRunning(exp: Experiment): exp is Experiment & { state: 'running' } {
  return exp.state === 'running';
}

export function isStopped(exp: Experiment): exp is Experiment & { state: 'stopped' } {
  return exp.state === 'stopped';
}

export function isArchived(exp: Experiment): exp is Experiment & { state: 'archived' } {
  return exp.state === 'archived';
}
```

---

## Implementation 4: Updated Type Definitions

**File:** `src/lib/api/types.ts` (UPDATE)

```typescript
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
  TagId,
  RoleId,
  ApiKeyId,
  WebhookId,
  Timestamp,
  TrafficPercentage,
} from './branded-types.js';

// =============================================================================
// ENUMS (Literal Unions)
// =============================================================================

export type ExperimentType = 'test' | 'feature';
export type ExperimentState =
  | 'created'
  | 'ready'
  | 'running'
  | 'stopped'
  | 'archived';

export type GoalType = 'conversion' | 'revenue' | 'count' | 'custom';

export type AnalysisType = 'fixed_horizon' | 'group_sequential';
export type RunningType = 'full_on' | 'experiment';

export type SignificanceResult = 'positive' | 'negative' | 'neutral' | 'inconclusive';

// =============================================================================
// EXPERIMENTS
// =============================================================================

/**
 * Experiment returned from API (read operations)
 * All required fields are guaranteed to be present
 */
export interface ExperimentRead {
  readonly id: ExperimentId;
  readonly name: string;
  readonly display_name: string;
  readonly type: ExperimentType;
  readonly state: ExperimentState;
  readonly unit_type_id: UnitTypeId;
  readonly created_at: string;  // ISO 8601 timestamp
  readonly updated_at: string;  // ISO 8601 timestamp
  readonly owner_id?: UserId;
  readonly description?: string;
  readonly hypothesis?: string;
  readonly traffic?: TrafficPercentage;
  readonly variants?: ReadonlyArray<VariantRead>;
  readonly tags?: ReadonlyArray<TagId>;
  readonly team_id?: TeamId;
  readonly application_id?: ApplicationId;
  readonly environment_id?: EnvironmentId;
  readonly started_at?: string;
  readonly stopped_at?: string;
  readonly full_on_at?: string;
  readonly archived_at?: string;
}

/**
 * Data required to create a new experiment
 */
export interface ExperimentCreate {
  readonly name: string;
  readonly type: ExperimentType;
  readonly unit_type_id: UnitTypeId;
  readonly display_name?: string;
  readonly description?: string;
  readonly hypothesis?: string;
  readonly traffic?: TrafficPercentage;
  readonly owner_id?: UserId;
  readonly team_id?: TeamId;
  readonly application_id?: ApplicationId;
  readonly environment_id?: EnvironmentId;
  readonly variants?: ReadonlyArray<VariantInput>;
  readonly tags?: ReadonlyArray<TagId>;
}

/**
 * Data that can be updated on an existing experiment
 */
export interface ExperimentUpdate {
  readonly display_name?: string;
  readonly description?: string;
  readonly hypothesis?: string;
  readonly traffic?: TrafficPercentage;
  readonly owner_id?: UserId;
  readonly team_id?: TeamId;
  readonly tags?: ReadonlyArray<TagId>;
}

/**
 * Main experiment type - defaults to read type
 */
export type Experiment = ExperimentRead;

/**
 * Short experiment summary (list views)
 */
export type ExperimentShort = Pick<
  ExperimentRead,
  'id' | 'name' | 'display_name' | 'type' | 'state' | 'created_at'
>;

// Legacy types for backward compatibility
/** @deprecated Use ExperimentRead */
export type ExperimentStrict = OpenAPIExperiment;
/** @deprecated Use ExperimentShort */
export type ExperimentShortStrict = OpenAPIExperimentShort;

// =============================================================================
// VARIANTS
// =============================================================================

export type ParsedConfig = Record<string, unknown>;

/**
 * Variant as stored/returned from API
 */
export interface VariantRead {
  readonly variant: number;
  readonly name: string;
  readonly config: string;  // JSON string
  readonly experiment_id: ExperimentId;
}

/**
 * Variant input for creation
 */
export interface VariantInput {
  readonly name: string;
  readonly config?: ParsedConfig | string;  // Can be object or JSON string
}

/**
 * Variant with parsed config for display
 */
export interface VariantParsed {
  readonly variant: number;
  readonly name: string;
  readonly config: ParsedConfig;
  readonly experiment_id: ExperimentId;
}

/**
 * Main variant type
 */
export type Variant = VariantRead;

/** @deprecated Use VariantRead */
export type VariantStrict = OpenAPIExperimentVariant;

// =============================================================================
// NOTES
// =============================================================================

export type NoteAction =
  | 'archive'
  | 'start'
  | 'stop'
  | 'create'
  | 'ready'
  | 'development'
  | 'full_on'
  | 'edit'
  | 'comment';

export interface NoteRead {
  readonly id: NoteId;
  readonly experiment_id: ExperimentId;
  readonly text?: string;
  readonly action?: NoteAction;
  readonly created_at: string;
  readonly created_by_user_id?: UserId;
}

export interface NoteCreate {
  readonly experiment_id: ExperimentId;
  readonly text: string;
  readonly action?: NoteAction;
}

export type Note = NoteRead;

/** @deprecated Use NoteRead */
export type NoteStrict = OpenAPIExperimentNote;

// =============================================================================
// ALERTS (Discriminated Union)
// =============================================================================

interface BaseAlert {
  readonly id: AlertId;
  readonly experiment_id: ExperimentId;
  readonly dismissed: boolean;
  readonly created_at: string;
}

export interface SampleRatioMismatchAlert extends BaseAlert {
  readonly type: 'sample_ratio_mismatch';
  readonly p_value?: number;
}

export interface CleanupNeededAlert extends BaseAlert {
  readonly type: 'cleanup_needed';
  readonly reason?: string;
}

export interface AudienceMismatchAlert extends BaseAlert {
  readonly type: 'audience_mismatch';
  readonly expected?: number;
  readonly actual?: number;
}

export interface SampleSizeReachedAlert extends BaseAlert {
  readonly type: 'sample_size_reached';
}

export interface ExperimentsInteractAlert extends BaseAlert {
  readonly type: 'experiments_interact';
  readonly conflicting_experiments?: ExperimentId[];
}

export interface GroupSequentialUpdatedAlert extends BaseAlert {
  readonly type: 'group_sequential_updated';
}

export interface AssignmentConflictAlert extends BaseAlert {
  readonly type: 'assignment_conflict';
}

export interface MetricThresholdReachedAlert extends BaseAlert {
  readonly type: 'metric_threshold_reached';
  readonly metric_id?: MetricId;
}

export type Alert =
  | SampleRatioMismatchAlert
  | CleanupNeededAlert
  | AudienceMismatchAlert
  | SampleSizeReachedAlert
  | ExperimentsInteractAlert
  | GroupSequentialUpdatedAlert
  | AssignmentConflictAlert
  | MetricThresholdReachedAlert;

// =============================================================================
// GOALS, SEGMENTS, TEAMS, etc. (Similar pattern)
// =============================================================================

export interface Goal {
  readonly id: GoalId;
  readonly name: string;
  readonly description?: string;
  readonly type?: GoalType;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export interface Segment {
  readonly id: SegmentId;
  readonly name: string;
  readonly description?: string;
  readonly value_source_attribute?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  readonly initials?: string;
  readonly color?: string;
  readonly description?: string;
  readonly archived?: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export interface User {
  readonly id: UserId;
  readonly email: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly job_title?: string;
  readonly archived?: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export interface Metric {
  readonly id: MetricId;
  readonly name: string;
  readonly description?: string;
  readonly version?: number;
  readonly archived?: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export type ExperimentTag = OpenAPIExperimentTag;
export type GoalTag = OpenAPIGoalTag;
export type MetricTag = OpenAPIMetricTag;
export type MetricCategory = OpenAPIMetricCategory;
export type Application = OpenAPIApplication;
export type Environment = OpenAPIEnvironment;
export type UnitType = OpenAPIUnitType;
export type ApiKey = OpenAPIApiKey;
export type Role = OpenAPIRole;
export type Permission = OpenAPIPermission;
export type Webhook = OpenAPIWebhook;

// =============================================================================
// CUSTOM INTERFACES
// =============================================================================

export interface ExperimentApplication {
  readonly experiment_id: ExperimentId;
  readonly application_id: ApplicationId;
  readonly application_version?: string;
  readonly application?: Application;
}

export interface ExperimentCustomFieldValue {
  readonly experiment_id: ExperimentId;
  readonly experiment_custom_section_field_id: number;
  readonly type: string;
  readonly value: string;
  readonly updated_at?: string;
  readonly updated_by_user_id?: UserId;
}

export interface CustomSectionField {
  readonly id: number;
  readonly name: string;
  readonly type: string;
}

export interface PermissionCategory {
  readonly id: number;
  readonly name: string;
  readonly permissions?: ReadonlyArray<Permission>;
}

// =============================================================================
// LIST OPTIONS
// =============================================================================

export interface ListOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly application?: string;
  readonly status?: string;
  readonly state?: ExperimentState;
  readonly type?: ExperimentType;
  readonly unit_types?: string;
  readonly owners?: string;
  readonly teams?: string;
  readonly tags?: string;
  readonly created_after?: number;
  readonly created_before?: number;
  readonly started_after?: number;
  readonly started_before?: number;
  readonly stopped_after?: number;
  readonly stopped_before?: number;
  readonly analysis_type?: AnalysisType;
  readonly running_type?: RunningType;
  readonly search?: string;
  readonly alert_srm?: number;
  readonly alert_cleanup_needed?: number;
  readonly alert_audience_mismatch?: number;
  readonly alert_sample_size_reached?: number;
  readonly alert_experiments_interact?: number;
  readonly alert_group_sequential_updated?: number;
  readonly alert_assignment_conflict?: number;
  readonly alert_metric_threshold_reached?: number;
  readonly significance?: SignificanceResult;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface APIErrorResponse {
  readonly message: string;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
}

export type HTTPStatusCode = 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503;

export interface APIError extends Error {
  readonly statusCode?: HTTPStatusCode;
  readonly response?: APIErrorResponse;
  readonly endpoint?: string;
  readonly method?: string;
}
```

---

## Implementation 5: Update API Client

**File:** `src/lib/api/client.ts` (UPDATE key methods)

```typescript
// Update imports
import type {
  Experiment,
  ExperimentCreate,
  ExperimentUpdate,
  ExperimentRead,
  ListOptions,
  Goal,
  // ... other imports
} from './types.js';

import type {
  ExperimentId,
  GoalId,
  SegmentId,
  // ... other branded types
} from './branded-types.js';

// Update method signatures
export class APIClient {
  // ... existing constructor

  async getExperiment(id: ExperimentId): Promise<ExperimentRead> {
    const response = await this.client.get<ExperimentRead>(`/experiments/${id}`);
    return response.data;
  }

  async createExperiment(data: ExperimentCreate): Promise<ExperimentRead> {
    const response = await this.client.post<ExperimentRead>('/experiments', data);
    return response.data;
  }

  async updateExperiment(id: ExperimentId, data: ExperimentUpdate): Promise<ExperimentRead> {
    const response = await this.client.put<ExperimentRead>(`/experiments/${id}`, data);
    return response.data;
  }

  async deleteExperiment(id: ExperimentId): Promise<void> {
    await this.client.delete(`/experiments/${id}`);
  }

  async startExperiment(id: ExperimentId): Promise<ExperimentRead> {
    const response = await this.client.post<ExperimentRead>(`/experiments/${id}/start`);
    return response.data;
  }

  async stopExperiment(id: ExperimentId): Promise<ExperimentRead> {
    const response = await this.client.post<ExperimentRead>(`/experiments/${id}/stop`);
    return response.data;
  }

  async archiveExperiment(id: ExperimentId, unarchive = false): Promise<ExperimentRead> {
    const response = await this.client.post<ExperimentRead>(
      `/experiments/${id}/${unarchive ? 'unarchive' : 'archive'}`
    );
    return response.data;
  }

  // Update goal methods
  async getGoal(id: GoalId): Promise<Goal> {
    const response = await this.client.get<Goal>(`/goals/${id}`);
    return response.data;
  }

  async createGoal(data: Partial<Goal>): Promise<Goal> {
    const response = await this.client.post<Goal>('/goals', data);
    return response.data;
  }

  async updateGoal(id: GoalId, data: Partial<Goal>): Promise<Goal> {
    const response = await this.client.put<Goal>(`/goals/${id}`, data);
    return response.data;
  }

  async deleteGoal(id: GoalId): Promise<void> {
    await this.client.delete(`/goals/${id}`);
  }

  // Similar updates for all other resource methods...
}
```

---

## Implementation 6: Update Command Files

**File:** `src/commands/experiments/get.ts` (EXAMPLE UPDATE)

```typescript
import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';

export const getCommand = new Command('get')
  .description('Get experiment details')
  .argument('<id>', 'experiment ID')
  .action(withErrorHandling(async (idStr: string) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    // Type-safe ID parsing
    const id = parseExperimentId(idStr);

    // Returns ExperimentRead with all fields guaranteed
    const experiment = await client.getExperiment(id);

    printFormatted(experiment, globalOptions);
  }));
```

**File:** `src/commands/experiments/create.ts` (EXAMPLE UPDATE)

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import type { ExperimentCreate } from '../../lib/api/types.js';
import { UnitTypeId, ApplicationId } from '../../lib/api/branded-types.js';

export const createCommand = new Command('create')
  .description('Create a new experiment')
  .option('--from-file <path>', 'create from markdown template file')
  .option('--name <name>', 'experiment name')
  .option('--display-name <name>', 'display name')
  .option('--type <type>', 'experiment type (test, feature)')
  .option('--unit-type-id <id>', 'unit type ID', parseInt)
  .option('--description <text>', 'experiment description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let data: ExperimentCreate;

    if (options.fromFile) {
      const template = parseExperimentFile(options.fromFile);
      // Validate and construct ExperimentCreate
      data = {
        name: template.name || '',
        type: template.type === 'feature' ? 'feature' : 'test',
        unit_type_id: UnitTypeId(template.unit_type_id || 1),
        display_name: template.display_name,
        description: template.description,
      };
    } else {
      if (!options.name) {
        throw new Error('--name is required');
      }
      if (!options.unitTypeId) {
        throw new Error('--unit-type-id is required');
      }

      data = {
        name: options.name,
        type: options.type === 'feature' ? 'feature' : 'test',
        unit_type_id: UnitTypeId(options.unitTypeId),
        display_name: options.displayName,
        description: options.description,
      };
    }

    const experiment = await client.createExperiment(data);

    console.log(chalk.green(`✓ Experiment created with ID: ${experiment.id}`));
    console.log(`  Name: ${experiment.name}`);
    console.log(`  Type: ${experiment.type}`);
  }));
```

---

## Summary

This implementation guide provides **ready-to-use code** for:

1. ✅ **Branded types** for all IDs and special values
2. ✅ **Updated validators** that return branded types
3. ✅ **Type guards** for runtime validation
4. ✅ **Proper type definitions** with Read/Create/Update separation
5. ✅ **Updated API client** with type-safe methods
6. ✅ **Command file examples** showing usage

**Next Steps:**

1. Create the new files (`branded-types.ts`, `type-guards.ts`)
2. Update existing files (`validators.ts`, `types.ts`, `client.ts`)
3. Update all command files to use branded types
4. Run type checker: `npm run type-check`
5. Run tests: `npm test`
6. Gradually remove deprecated types

This will dramatically improve type safety while maintaining backward compatibility during migration.
