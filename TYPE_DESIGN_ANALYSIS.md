# Type Design Analysis: ABSmartly CLI TypeScript

**Analysis Date:** 2026-02-06
**Codebase:** `/Users/joalves/git_tree/absmartly-cli-ts`
**Scope:** Core type definitions, API types, configuration types, and validation

---

## Executive Summary

This codebase demonstrates **moderate type safety** with several critical gaps that expose it to runtime errors and maintenance burdens. The primary issues are:

1. **Weak identity types** - All IDs are plain `number`, allowing ID confusion
2. **Over-permissive Partial types** - Breaking type safety at API boundaries
3. **Missing invariant enforcement** - No validation at construction time
4. **String-based enums** - Missing exhaustiveness checking
5. **Type/runtime misalignment** - OpenAPI types not enforced at runtime

**Overall Type Safety Grade: C+ (6.5/10)**

---

## Type-by-Type Analysis

### 1. Core API Types (`src/lib/api/types.ts`)

#### Type: `Experiment`

```typescript
export type Experiment = Partial<OpenAPIExperiment> & { id: number; name: string };
```

**Invariants Identified:**
- Must have a positive integer `id`
- Must have a non-empty `name`
- Type field should be constrained to known experiment types
- State transitions follow a specific lifecycle
- Variants array should have at least 1 element
- Traffic percentage should be 0-100

**Ratings:**

- **Encapsulation**: 2/10
  All fields are exposed as mutable. No private state. No behavior encapsulation.

- **Invariant Expression**: 1/10
  The `Partial<OpenAPIExperiment>` makes almost everything optional, destroying invariants from the OpenAPI spec. Only `id` and `name` are guaranteed.

- **Invariant Usefulness**: 3/10
  The two guaranteed fields (`id`, `name`) are minimally useful, but the lack of other guarantees means any code using this type must defensively check everything.

- **Invariant Enforcement**: 1/10
  No constructor, no validation, no runtime checks. Invalid instances can be created trivially.

**Strengths:**
- Simple and easy to use for partial updates
- Flexible for different API response shapes

**Concerns:**
- **CRITICAL**: Using `Partial` on the entire OpenAPI type is dangerous. Fields that should always be present (like `type`, `state`, `unit_type_id`) are now optional.
- **ID Safety**: `id: number` allows mixing experiment IDs with goal IDs, metric IDs, etc.
- **State Machine**: No enforcement of valid state transitions (created → ready → running → stopped)
- **Type Confusion**: Both strict and partial variants exist, causing confusion about which to use

**Recommended Improvements:**

```typescript
// Branded type for type-safe IDs
export type ExperimentId = number & { readonly __brand: 'ExperimentId' };
export type GoalId = number & { readonly __brand: 'GoalId' };
export type SegmentId = number & { readonly __brand: 'SegmentId' };

// Helper to create branded IDs with validation
export function ExperimentId(id: number): ExperimentId {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ExperimentId: ${id}`);
  }
  return id as ExperimentId;
}

// Proper type/state enums with exhaustiveness
export type ExperimentType = 'test' | 'feature';
export type ExperimentState =
  | 'created'
  | 'ready'
  | 'running'
  | 'stopped'
  | 'archived';

// Split into required and optional fields
export interface ExperimentRequired {
  readonly id: ExperimentId;
  readonly name: string;
  readonly type: ExperimentType;
  readonly state: ExperimentState;
  readonly unit_type_id: number;  // Should also be branded
  readonly created_at: string;  // Should be Date or branded Timestamp
}

export interface ExperimentOptional {
  readonly display_name?: string;
  readonly description?: string;
  readonly traffic?: number;  // 0-100, should be validated
  readonly variants?: ReadonlyArray<Variant>;
  readonly owner_id?: number;  // Should be UserId
}

export type Experiment = ExperimentRequired & ExperimentOptional;

// For updates, be explicit about what's partial
export type ExperimentUpdate = Partial<Omit<Experiment, 'id' | 'created_at'>>;

// For creation, require the essentials
export type ExperimentCreate = Pick<Experiment, 'name' | 'type' | 'unit_type_id'>
  & Partial<ExperimentOptional>;
```

---

#### Type: `Variant`

```typescript
export type Variant = {
  name: string;
  config?: string | object;
  variant?: number;
  experiment_id?: number;
};
```

**Invariants Identified:**
- `name` should be non-empty
- `config` when string should be valid JSON
- `variant` should be non-negative integer (0 for control, 1+ for treatments)
- `experiment_id` should reference a valid experiment

**Ratings:**

- **Encapsulation**: 3/10
  All fields mutable, but at least there's some structure.

- **Invariant Expression**: 2/10
  The `config?: string | object` is problematic - no clarity on when it's which type.

- **Invariant Usefulness**: 4/10
  The name requirement is useful, but everything else is too loose.

- **Invariant Enforcement**: 1/10
  No validation of JSON string, no bounds checking on variant number.

**Concerns:**
- **Config Type Confusion**: `string | object` creates ambiguity. Is it parsed or not?
- **Optional Everything**: `variant` and `experiment_id` should be required in most contexts
- **No JSON Validation**: String config could be invalid JSON

**Recommended Improvements:**

```typescript
// Separate branded type for variant config
export type VariantConfig = Record<string, unknown>;

// Separate read and write types
export interface VariantStored {
  readonly name: string;
  readonly config: VariantConfig;  // Always parsed
  readonly variant: number;  // 0 = control, 1+ = treatment
  readonly experiment_id: ExperimentId;
}

export interface VariantInput {
  readonly name: string;
  readonly config: string | VariantConfig;  // Can be JSON string or object
}

export function parseVariantConfig(input: string | VariantConfig): VariantConfig {
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Config must be a JSON object');
      }
      return parsed;
    } catch (error) {
      throw new Error(
        `Invalid variant config JSON: ${error instanceof Error ? error.message : error}`
      );
    }
  }
  return input;
}
```

---

#### Type: `ListOptions`

```typescript
export interface ListOptions {
  limit?: number;
  offset?: number;
  application?: string;
  status?: string;
  state?: string;
  type?: string;
  // ... many more string fields
}
```

**Invariants Identified:**
- `limit` should be positive, likely capped (e.g., 1-1000)
- `offset` should be non-negative
- Date ranges should have `after <= before`
- String fields should be constrained to known values

**Ratings:**

- **Encapsulation**: 4/10
  Read-only interface is good, but no validation layer.

- **Invariant Expression**: 2/10
  All the enum-like strings should be literal types.

- **Invariant Usefulness**: 5/10
  The optional nature is appropriate for filters.

- **Invariant Enforcement**: 1/10
  No bounds checking, no date validation.

**Concerns:**
- **String Enums**: Fields like `status`, `state`, `type` should use literal unions
- **No Bounds**: `limit` and `offset` unconstrained
- **Alert Flags**: The `alert_*` pattern could be a discriminated union

**Recommended Improvements:**

```typescript
export type ExperimentStatus = 'active' | 'inactive' | 'draft';
export type AnalysisType = 'frequentist' | 'bayesian' | 'sequential';

export interface ListOptionsValidated {
  readonly limit?: number;  // 1-1000, validated at runtime
  readonly offset?: number;  // >= 0
  readonly application?: string;
  readonly status?: ExperimentStatus;  // Now type-safe
  readonly state?: ExperimentState;
  readonly type?: ExperimentType;
  readonly analysis_type?: AnalysisType;
  readonly search?: string;
  // ... rest with proper types
}

export function validateListOptions(options: ListOptions): ListOptionsValidated {
  if (options.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 1000) {
      throw new Error('limit must be an integer between 1 and 1000');
    }
  }

  if (options.offset !== undefined) {
    if (!Number.isInteger(options.offset) || options.offset < 0) {
      throw new Error('offset must be a non-negative integer');
    }
  }

  // Additional validations...
  return options as ListOptionsValidated;
}
```

---

#### Type: `APIError`

```typescript
export interface APIError extends Error {
  statusCode?: number;
  response?: unknown;
}
```

**Ratings:**

- **Encapsulation**: 5/10
- **Invariant Expression**: 4/10
- **Invariant Usefulness**: 6/10
- **Invariant Enforcement**: 3/10

**Concerns:**
- `response?: unknown` is too loose - should be typed based on API error schema
- Status codes should be specific HTTP status literals
- No discrimination between error types

**Recommended Improvements:**

```typescript
export interface APIErrorResponse {
  readonly message: string;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
}

export type HTTPStatusCode = 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503;

export interface APIError extends Error {
  readonly statusCode: HTTPStatusCode;
  readonly response?: APIErrorResponse;
  readonly endpoint?: string;
  readonly method?: string;
}

// Discriminated union for different error types
export type APIErrorType =
  | { kind: 'unauthorized'; statusCode: 401 }
  | { kind: 'forbidden'; statusCode: 403 }
  | { kind: 'notFound'; statusCode: 404; resource: string }
  | { kind: 'rateLimit'; statusCode: 429; retryAfter?: number }
  | { kind: 'server'; statusCode: 500 | 502 | 503 }
  | { kind: 'validation'; statusCode: 400; fields: Record<string, string> };
```

---

### 2. Configuration Types (`src/lib/config/config.ts`)

#### Type: `Config`

```typescript
export interface Config {
  'default-profile': string;
  'analytics-opt-out': boolean;
  output: string;
  profiles: Record<string, Profile>;
}
```

**Invariants Identified:**
- `default-profile` must reference an existing profile in `profiles`
- `output` should be one of known formats
- Profile names should be non-empty, valid identifiers

**Ratings:**

- **Encapsulation**: 4/10
  Interface is good but mutable.

- **Invariant Expression**: 3/10
  The `default-profile` → `profiles` relationship not enforced.

- **Invariant Usefulness**: 6/10
  The structure is sensible.

- **Invariant Enforcement**: 2/10
  No validation that default-profile exists in profiles object.

**Concerns:**
- **Referential Integrity**: No guarantee `default-profile` is in `profiles`
- **Output Type**: Should use the `OutputFormat` literal union
- **Prototype Pollution**: Using `Record<string, Profile>` allows `__proto__` keys

**Recommended Improvements:**

```typescript
export type ProfileName = string & { readonly __brand: 'ProfileName' };
export type OutputFormat = 'table' | 'json' | 'yaml' | 'plain' | 'markdown';

export interface ConfigData {
  readonly 'analytics-opt-out': boolean;
  readonly output: OutputFormat;
}

// Non-empty map to prevent empty profiles
export interface ProfileMap {
  readonly [key: string]: Profile;
}

export class Config {
  private constructor(
    private readonly data: ConfigData,
    private readonly _profiles: ProfileMap,
    private _defaultProfile: ProfileName
  ) {
    // Invariant: default profile must exist
    if (!this._profiles[this._defaultProfile]) {
      throw new Error(`Default profile "${this._defaultProfile}" not found in profiles`);
    }
  }

  static create(data: {
    'default-profile': string;
    'analytics-opt-out': boolean;
    output: OutputFormat;
    profiles: Record<string, Profile>;
  }): Config {
    // Validate no dangerous keys
    for (const key of Object.keys(data.profiles)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error(`Invalid profile name: ${key}`);
      }
    }

    // Ensure at least one profile exists
    if (Object.keys(data.profiles).length === 0) {
      throw new Error('Config must have at least one profile');
    }

    return new Config(
      {
        'analytics-opt-out': data['analytics-opt-out'],
        output: data.output,
      },
      data.profiles,
      data['default-profile'] as ProfileName
    );
  }

  get defaultProfile(): ProfileName {
    return this._defaultProfile;
  }

  get profiles(): ReadonlyArray<[string, Profile]> {
    return Object.entries(this._profiles);
  }

  getProfile(name?: string): Profile {
    const profileName = name ?? this._defaultProfile;
    const profile = this._profiles[profileName];
    if (!profile) {
      throw new Error(`Profile "${profileName}" not found`);
    }
    return profile;
  }

  // Maintains invariant when setting default
  setDefaultProfile(name: string): Config {
    if (!this._profiles[name]) {
      throw new Error(`Cannot set default to non-existent profile: ${name}`);
    }
    return new Config(this.data, this._profiles, name as ProfileName);
  }
}
```

---

### 3. Validation Utilities (`src/lib/utils/validators.ts`)

#### Function: `parseId`

```typescript
export function parseId(value: string): number {
  const id = parseInt(value, 10);
  if (isNaN(id)) {
    throw new Error(`Invalid ID: "${value}" -- must be a number`);
  }
  if (id <= 0) {
    throw new Error(`Invalid ID: ${id} -- must be a positive integer`);
  }
  if (!Number.isInteger(id)) {
    throw new Error(`Invalid ID: ${id} -- must be an integer`);
  }
  return id;
}
```

**Ratings:**

- **Encapsulation**: 7/10
  Good pure function with clear contract.

- **Invariant Expression**: 8/10
  Clear validation rules.

- **Invariant Usefulness**: 8/10
  Catches real errors.

- **Invariant Enforcement**: 9/10
  Strong runtime validation.

**Strengths:**
- Comprehensive validation
- Good error messages
- Pure function

**Concerns:**
- Returns plain `number` instead of branded type
- No way to specify which ID type (ExperimentId vs GoalId)

**Recommended Improvements:**

```typescript
export function parseId<T extends number>(value: string, typeName: string): T {
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

// Type-safe wrappers
export function parseExperimentId(value: string): ExperimentId {
  return parseId<ExperimentId>(value, 'ExperimentId');
}

export function parseGoalId(value: string): GoalId {
  return parseId<GoalId>(value, 'GoalId');
}
```

---

### 4. Client Types (`src/lib/api/client.ts`)

#### Type: `ClientOptions`

```typescript
export interface ClientOptions {
  verbose?: boolean;
  timeout?: number;
}
```

**Ratings:**

- **Encapsulation**: 6/10
- **Invariant Expression**: 5/10
- **Invariant Usefulness**: 7/10
- **Invariant Enforcement**: 3/10

**Concerns:**
- `timeout` should have bounds (min/max)
- No validation in constructor

**Recommended Improvements:**

```typescript
export interface ClientOptions {
  readonly verbose?: boolean;
  readonly timeout?: number;  // milliseconds, 1000-120000
  readonly retries?: number;   // 0-10
}

export function validateClientOptions(options: ClientOptions): ClientOptions {
  if (options.timeout !== undefined) {
    if (!Number.isInteger(options.timeout) || options.timeout < 1000 || options.timeout > 120000) {
      throw new Error('timeout must be between 1000 and 120000 milliseconds');
    }
  }

  if (options.retries !== undefined) {
    if (!Number.isInteger(options.retries) || options.retries < 0 || options.retries > 10) {
      throw new Error('retries must be between 0 and 10');
    }
  }

  return options;
}
```

---

### 5. Template Parser Types (`src/lib/template/parser.ts`)

#### Type: `ExperimentTemplate`

```typescript
export interface ExperimentTemplate {
  name?: string;
  display_name?: string;
  type?: string;
  state?: string;
  percentage_of_traffic?: number;
  // ... all optional
}
```

**Ratings:**

- **Encapsulation**: 3/10
- **Invariant Expression**: 2/10
- **Invariant Usefulness**: 4/10
- **Invariant Enforcement**: 1/10

**Concerns:**
- Everything is optional, making it hard to know what's actually required
- String enums should be literal types
- No validation in parsing

**Recommended Improvements:**

```typescript
// Separate parsed (everything optional) from validated template
export interface ExperimentTemplateParsed {
  readonly name?: string;
  readonly display_name?: string;
  readonly type?: ExperimentType;
  readonly state?: ExperimentState;
  readonly percentage_of_traffic?: number;
  readonly variants?: ReadonlyArray<VariantTemplate>;
}

export interface ExperimentTemplateValidated {
  readonly name: string;  // Required after validation
  readonly display_name?: string;
  readonly type: ExperimentType;
  readonly state: ExperimentState;
  readonly percentage_of_traffic: number;  // 0-100
  readonly variants: ReadonlyArray<VariantTemplate>;  // At least 1
}

export function validateExperimentTemplate(
  parsed: ExperimentTemplateParsed
): ExperimentTemplateValidated {
  if (!parsed.name) {
    throw new Error('Template must specify experiment name');
  }

  const type = parsed.type ?? 'test';
  if (type !== 'test' && type !== 'feature') {
    throw new Error(`Invalid experiment type: ${type}`);
  }

  const traffic = parsed.percentage_of_traffic ?? 100;
  if (traffic < 0 || traffic > 100) {
    throw new Error(`Traffic percentage must be 0-100, got ${traffic}`);
  }

  if (!parsed.variants || parsed.variants.length === 0) {
    throw new Error('Template must specify at least one variant');
  }

  return {
    name: parsed.name,
    display_name: parsed.display_name,
    type,
    state: parsed.state ?? 'created',
    percentage_of_traffic: traffic,
    variants: parsed.variants,
  };
}
```

---

### 6. Output Formatter Types (`src/lib/output/formatter.ts`)

#### Type: `OutputFormat`

```typescript
export type OutputFormat = 'table' | 'json' | 'yaml' | 'plain' | 'markdown';
```

**Ratings:**

- **Encapsulation**: 9/10
  Perfect use of literal union type.

- **Invariant Expression**: 10/10
  Exhaustively lists valid formats.

- **Invariant Usefulness**: 10/10
  Prevents invalid formats at compile time.

- **Invariant Enforcement**: 10/10
  TypeScript enforces this automatically.

**Strengths:**
- Excellent example of proper literal union usage
- Provides exhaustiveness checking
- Self-documenting

**This is the gold standard** - other types should follow this pattern.

---

## Cross-Cutting Concerns

### 1. Missing Branded Types for IDs

**Problem:** All IDs are plain `number`, allowing dangerous confusion:

```typescript
const experimentId = 123;
const goalId = 456;

// Both accepted anywhere expecting a number
await client.getExperiment(goalId);  // Oops! Wrong ID type
await client.getGoal(experimentId);   // Type system can't catch this
```

**Impact:** High - can cause subtle data corruption bugs

**Recommendation:** Implement branded types for all ID types:

```typescript
export type ExperimentId = number & { readonly __brand: 'ExperimentId' };
export type GoalId = number & { readonly __brand: 'GoalId' };
export type SegmentId = number & { readonly __brand: 'SegmentId' };
export type TeamId = number & { readonly __brand: 'TeamId' };
export type UserId = number & { readonly __brand: 'UserId' };
export type MetricId = number & { readonly __brand: 'MetricId' };
export type ApplicationId = number & { readonly __brand: 'ApplicationId' };
export type EnvironmentId = number & { readonly __brand: 'EnvironmentId' };
export type UnitTypeId = number & { readonly __brand: 'UnitTypeId' };
```

### 2. Overuse of Partial<> for API Types

**Problem:** Making entire OpenAPI types partial destroys their invariants:

```typescript
export type Experiment = Partial<OpenAPIExperiment> & { id: number; name: string };
```

This makes fields that should always exist (like `type`, `state`) optional, forcing defensive checks everywhere.

**Impact:** High - reduces type safety dramatically

**Recommendation:**
- Use `Partial<>` only for update operations
- Create separate types for different use cases (read, create, update)
- Use `Pick<>` and `Omit<>` to be explicit about what's required

### 3. No Runtime Validation at Boundaries

**Problem:** Types are only checked at compile time. Runtime data from API or user input is trusted without validation.

**Impact:** Medium-High - can crash or behave unexpectedly with bad data

**Recommendation:** Use a validation library like Zod:

```typescript
import { z } from 'zod';

const ExperimentSchema = z.object({
  id: z.number().int().positive().brand<'ExperimentId'>(),
  name: z.string().min(1),
  type: z.enum(['test', 'feature']),
  state: z.enum(['created', 'ready', 'running', 'stopped', 'archived']),
  unit_type_id: z.number().int().positive(),
  traffic: z.number().min(0).max(100).optional(),
  // ...
});

export type Experiment = z.infer<typeof ExperimentSchema>;

// Validate API responses
const experiment = ExperimentSchema.parse(apiResponse);
```

### 4. String-based Enums Without Exhaustiveness

**Problem:** Many types use `string` for fields that should be enums:

```typescript
export interface ListOptions {
  status?: string;  // Should be literal union
  state?: string;   // Should be literal union
  type?: string;    // Should be literal union
}
```

**Impact:** Medium - allows invalid values, no autocomplete

**Recommendation:** Use literal unions consistently:

```typescript
export type ExperimentStatus = 'active' | 'inactive' | 'draft';
export type ExperimentState = 'created' | 'ready' | 'running' | 'stopped' | 'archived';
export type ExperimentType = 'test' | 'feature';
```

### 5. Union Type Exhaustiveness

**Problem:** No use of discriminated unions for heterogeneous types.

**Example where it would help:**

```typescript
// Current: no discrimination
export interface Alert {
  id: number;
  type: string;
  dismissed?: boolean;
  created_at?: string;
}

// Recommended: discriminated union
export type Alert =
  | {
      kind: 'sample_ratio_mismatch';
      id: number;
      srm_p_value: number;
      dismissed: boolean;
    }
  | {
      kind: 'cleanup_needed';
      id: number;
      reason: string;
      dismissed: boolean;
    }
  | {
      kind: 'audience_mismatch';
      id: number;
      expected_audience: number;
      actual_audience: number;
      dismissed: boolean;
    };

// Now you can use exhaustive switch
function handleAlert(alert: Alert): string {
  switch (alert.kind) {
    case 'sample_ratio_mismatch':
      return `SRM detected: p-value ${alert.srm_p_value}`;
    case 'cleanup_needed':
      return `Cleanup needed: ${alert.reason}`;
    case 'audience_mismatch':
      return `Audience mismatch: expected ${alert.expected_audience}, got ${alert.actual_audience}`;
    default:
      const _exhaustive: never = alert;  // Compile error if case missing
      return _exhaustive;
  }
}
```

### 6. Missing Type Guards

**Problem:** No helper functions to narrow types at runtime.

**Recommendation:**

```typescript
export function isExperiment(value: unknown): value is Experiment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

export function isExperimentState(value: unknown): value is ExperimentState {
  return (
    typeof value === 'string' &&
    ['created', 'ready', 'running', 'stopped', 'archived'].includes(value)
  );
}
```

### 7. Phantom Types for State Tracking

**Problem:** No compile-time tracking of stateful operations.

**Use case:** Ensuring experiments are in correct state before operations:

```typescript
export type ExperimentInState<S extends ExperimentState> = Experiment & {
  readonly state: S;
};

export type RunnableExperiment = ExperimentInState<'ready'>;
export type RunningExperiment = ExperimentInState<'running'>;

// Type-safe state transitions
export class ExperimentService {
  async start(exp: RunnableExperiment): Promise<RunningExperiment> {
    // Can only call start on ready experiments
    const result = await api.startExperiment(exp.id);
    return result as RunningExperiment;
  }

  async stop(exp: RunningExperiment): Promise<ExperimentInState<'stopped'>> {
    // Can only stop running experiments
    const result = await api.stopExperiment(exp.id);
    return result as ExperimentInState<'stopped'>;
  }
}
```

---

## Priority Recommendations

### HIGH Priority (Fix immediately)

1. **Add branded types for all ID fields**
   - Prevents ID confusion bugs
   - Low effort, high impact
   - See task #71

2. **Stop using `Partial<OpenAPIExperiment>`**
   - Breaking core type invariants
   - Create separate types for read/create/update operations
   - Critical for maintainability

3. **Add runtime validation at API boundaries**
   - Use Zod or similar validation library
   - Validate all API responses and user inputs
   - Prevents runtime crashes

4. **Replace string types with literal unions**
   - Change `status?: string` to `status?: ExperimentStatus`
   - Enables autocomplete and exhaustiveness checking
   - Quick wins throughout codebase

### MEDIUM Priority (Plan for next iteration)

5. **Implement proper Config class with invariant enforcement**
   - Protect against prototype pollution
   - Enforce referential integrity (default-profile must exist)
   - See task #64 and #65

6. **Add discriminated unions for Alert types**
   - Better type safety for different alert kinds
   - Enables exhaustive pattern matching

7. **Create type guards for runtime checks**
   - Helper functions to narrow types safely
   - Useful at JSON parsing boundaries

8. **Add template validation layer**
   - Separate parsed (all optional) from validated (required fields)
   - Provides better error messages

### LOW Priority (Nice to have)

9. **Use phantom types for state machine tracking**
   - Compile-time verification of state transitions
   - More advanced but powerful

10. **Add readonly modifiers consistently**
    - Prevent accidental mutations
    - Documents intent

---

## Code Examples

### Example 1: Complete Branded ID System

```typescript
// src/lib/api/branded-ids.ts

export type ExperimentId = number & { readonly __brand: 'ExperimentId' };
export type GoalId = number & { readonly __brand: 'GoalId' };
export type SegmentId = number & { readonly __brand: 'SegmentId' };
export type TeamId = number & { readonly __brand: 'TeamId' };
export type UserId = number & { readonly __brand: 'UserId' };

function validateId(id: number, typeName: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${typeName}: must be a positive integer, got ${id}`);
  }
}

export function ExperimentId(id: number): ExperimentId {
  validateId(id, 'ExperimentId');
  return id as ExperimentId;
}

export function GoalId(id: number): GoalId {
  validateId(id, 'GoalId');
  return id as GoalId;
}

export function SegmentId(id: number): SegmentId {
  validateId(id, 'SegmentId');
  return id as SegmentId;
}

// Usage in parser
export function parseExperimentId(value: string): ExperimentId {
  const id = parseInt(value, 10);
  return ExperimentId(id);
}

// Usage in API client
export class APIClient {
  async getExperiment(id: ExperimentId): Promise<Experiment> {
    // Now type-safe!
    const response = await this.client.get<Experiment>(`/experiments/${id}`);
    return response.data;
  }

  async getGoal(id: GoalId): Promise<Goal> {
    // Can't accidentally pass ExperimentId here
    const response = await this.client.get<Goal>(`/goals/${id}`);
    return response.data;
  }
}
```

### Example 2: Proper Experiment Types

```typescript
// src/lib/api/experiment-types.ts

import { ExperimentId, UserId, UnitTypeId } from './branded-ids.js';

export type ExperimentType = 'test' | 'feature';
export type ExperimentState =
  | 'created'
  | 'ready'
  | 'running'
  | 'stopped'
  | 'archived';

// Core read type - everything that comes from API
export interface Experiment {
  readonly id: ExperimentId;
  readonly name: string;
  readonly display_name: string;
  readonly type: ExperimentType;
  readonly state: ExperimentState;
  readonly unit_type_id: UnitTypeId;
  readonly created_at: string;
  readonly updated_at: string;
  readonly owner_id?: UserId;
  readonly description?: string;
  readonly traffic?: number;  // 0-100
  readonly variants?: ReadonlyArray<Variant>;
}

// For creating new experiments
export interface ExperimentCreate {
  readonly name: string;
  readonly type: ExperimentType;
  readonly unit_type_id: UnitTypeId;
  readonly display_name?: string;
  readonly description?: string;
  readonly traffic?: number;
  readonly owner_id?: UserId;
  readonly variants?: ReadonlyArray<VariantInput>;
}

// For updating existing experiments
export interface ExperimentUpdate {
  readonly name?: string;
  readonly display_name?: string;
  readonly description?: string;
  readonly traffic?: number;
  readonly owner_id?: UserId;
  // Note: can't change type, state via update - use specific methods
}

// Type guard
export function isExperiment(value: unknown): value is Experiment {
  return (
    typeof value === 'object' &&
    value !== null &&
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
```

### Example 3: Zod Schema Integration

```typescript
// src/lib/api/schemas.ts

import { z } from 'zod';

// Brand helper for Zod
function brand<T extends string>() {
  return z.number().int().positive().brand<T>();
}

export const ExperimentIdSchema = brand<'ExperimentId'>();
export const GoalIdSchema = brand<'GoalId'>();
export const UserIdSchema = brand<'UserId'>();

export const ExperimentTypeSchema = z.enum(['test', 'feature']);
export const ExperimentStateSchema = z.enum([
  'created',
  'ready',
  'running',
  'stopped',
  'archived',
]);

export const VariantSchema = z.object({
  name: z.string().min(1),
  config: z.record(z.unknown()),
  variant: z.number().int().min(0),
  experiment_id: ExperimentIdSchema,
});

export const ExperimentSchema = z.object({
  id: ExperimentIdSchema,
  name: z.string().min(1).max(100),
  display_name: z.string().min(1).max(200).optional(),
  type: ExperimentTypeSchema,
  state: ExperimentStateSchema,
  unit_type_id: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  owner_id: UserIdSchema.optional(),
  description: z.string().max(5000).optional(),
  traffic: z.number().min(0).max(100).optional(),
  variants: z.array(VariantSchema).optional(),
});

export type Experiment = z.infer<typeof ExperimentSchema>;

// Use in API client
export class APIClient {
  async getExperiment(id: ExperimentId): Promise<Experiment> {
    const response = await this.client.get(`/experiments/${id}`);

    // Runtime validation!
    return ExperimentSchema.parse(response.data);
  }
}
```

---

## Metrics Summary

| Category | Current Score | Target Score | Priority |
|----------|--------------|--------------|----------|
| **ID Type Safety** | 1/10 | 9/10 | HIGH |
| **Invariant Expression** | 3/10 | 8/10 | HIGH |
| **Runtime Validation** | 2/10 | 8/10 | HIGH |
| **Enum Safety** | 4/10 | 9/10 | HIGH |
| **Encapsulation** | 4/10 | 7/10 | MEDIUM |
| **Type Guards** | 1/10 | 7/10 | MEDIUM |
| **Discriminated Unions** | 0/10 | 6/10 | MEDIUM |
| **State Machine Types** | 0/10 | 5/10 | LOW |
| **Overall Type Safety** | 3.5/10 | 8/10 | - |

---

## Conclusion

The ABSmartly CLI TypeScript codebase has a **weak type foundation** that allows many runtime errors to slip through. The primary issues are:

1. **All IDs are plain numbers** - high confusion risk
2. **Excessive use of Partial<>** - destroying OpenAPI invariants
3. **No runtime validation** - types are compile-time only
4. **String-based enums** - missing exhaustiveness checks

The good news: These are all **solvable without major refactoring**. The recommendations above provide concrete paths forward, starting with branded types (low effort, high impact).

Implementing the HIGH priority recommendations would raise the type safety score from **3.5/10 to ~7/10**, dramatically reducing bugs and improving maintainability.

---

## Next Steps

1. Review this analysis with the team
2. Prioritize which improvements to tackle first
3. Create implementation tasks (many already exist, see task list)
4. Consider adopting Zod for runtime validation
5. Update coding standards to require:
   - Branded types for all IDs
   - Literal unions instead of string
   - Separate read/create/update types
   - Runtime validation at boundaries

**Files to Update (in order):**
1. `src/lib/api/types.ts` - Add branded types, proper enums
2. `src/lib/utils/validators.ts` - Add branded ID parsers
3. `src/lib/api/client.ts` - Update method signatures with branded types
4. `src/lib/config/config.ts` - Implement Config class with invariants
5. All command files - Update to use new types

This will be a gradual process, but each step will provide immediate value.
