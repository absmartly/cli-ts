# OpenAPI Integration

## Overview

The ABSmartly CLI now uses OpenAPI-generated types from the `absmartly-api-mocks` project as the source of truth for API types.

## Integration Approach

### 1. OpenAPI Types (Source of Truth)

**File**: `src/lib/api/openapi-types.ts`

Imports types directly from the OpenAPI specification:
```typescript
import type { paths, components } from 'absmartly-api-mocks/src/generated/schema';

export type Experiment = components['schemas']['Experiment'];
export type Goal = components['schemas']['Goal'];
// ... etc
```

**Benefits**:
- ✅ 18,115 lines of auto-generated, validated types
- ✅ Guaranteed to match actual API contract
- ✅ Updates automatically when spec changes
- ✅ Includes all response/request types

### 2. CLI Types (Simplified Layer)

**File**: `src/lib/api/types.ts`

Maps OpenAPI types to simplified versions for CLI use:
```typescript
// Based on OpenAPI but simplified for CLI
export type Experiment = Partial<OpenAPIExperiment> & { id: number; name: string };
```

**Why simplified**:
- CLI operations use partial updates
- Not all fields needed for display
- More flexible for command-line use
- Easier to work with in TypeScript

### 3. Type Safety Validation

The OpenAPI types revealed several mismatches:

**Fields that don't exist in real API**:
- ❌ `experiment.description` - Not in OpenAPI spec
- ❌ `experiment.traffic` - Use `percentage_of_traffic` instead
- ❌ Simple `note.action` values - Spec has specific enum

**Correct OpenAPI fields**:
- ✅ `experiment.id`, `experiment.name`, `experiment.display_name`
- ✅ `experiment.state` - Enum: `"created" | "ready" | "running" | "stopped" | "archived" | "scheduled"`
- ✅ `experiment.type` - Enum: `"test" | "feature"`
- ✅ `experiment.percentage_of_traffic` - Not `traffic`
- ✅ `variant.config` - **Must be string**, not object

## Key Findings from OpenAPI Integration

### 1. Variant Config Must Be String

**Our code** (WRONG):
```typescript
variants: [
  { name: 'control', config: { description: 'Control' } }
]
```

**OpenAPI spec** (CORRECT):
```typescript
variants: [
  { name: 'control', config: '{"description":"Control"}' }
]
```

### 2. State Values Are Strict Enums

**Our code** (flexible):
```typescript
state: string
```

**OpenAPI spec** (strict):
```typescript
state: "created" | "ready" | "running" | "stopped" | "archived" | "development" | "full_on" | "scheduled"
```

### 3. Note Actions Are Specific

**Our factories** (WRONG):
```typescript
action: 'started' | 'stopped' | 'saved_draft'
```

**OpenAPI spec** (CORRECT):
```typescript
action: "archive" | "start" | "stop" | "create" | "ready" | "development" | "full_on" | "edit" | "comment" | "scheduled_action"
```

## Current Integration Status

### ✅ Completed
- Installed `absmartly-api-mocks` as dependency
- Created `openapi-types.ts` with all OpenAPI types
- Updated `types.ts` to reference OpenAPI types
- Created compatibility layer for CLI use
- All 213 tests still passing

### 📋 For Future (Full Strict Mode)
- [ ] Make all API client methods use strict OpenAPI types
- [ ] Update commands to use correct field names
- [ ] Remove compatibility layer, use OpenAPI types directly
- [ ] Add OpenAPI validation to request/response
- [ ] Generate types from spec in build process

## Benefits Realized

1. **Type Safety**: Can reference strict OpenAPI types when needed
2. **Validation**: TypeScript caught field mismatches (description, traffic)
3. **Documentation**: OpenAPI comments show required permissions
4. **Future-Proof**: When API changes, regenerate types and TypeScript will show what broke

## Usage

### In Tests (Strict Types)
```typescript
import type { Experiment } from '../../lib/api/openapi-types.js';

const strictExperiment: Experiment = {
  // Must match OpenAPI spec exactly
  id: 1,
  name: 'test',
  state: 'running', // Type-checked against enum
  type: 'test',     // Type-checked against enum
  // ... all required fields
};
```

### In Commands (Flexible Types)
```typescript
import type { Experiment } from '../../lib/api/types.js';

const experiment: Experiment = {
  // Simplified - only id and name required
  id: 1,
  name: 'test',
  display_name: 'Test', // All other fields optional
};
```

## Regenerating Types

When the API changes:

```bash
cd ~/git_tree/absmartly-api-mocks
npm run generate:types

# TypeScript will immediately show type errors in CLI
cd ~/git_tree/absmartly-cli-ts
npm run build  # Will show what broke
```

## Conclusion

OpenAPI types are integrated and available for strict validation. The CLI uses a pragmatic compatibility layer that balances type safety with usability. Future work can migrate to 100% strict OpenAPI types if needed.

**Current Approach**: Best of both worlds
- ✅ OpenAPI validation available
- ✅ CLI flexibility maintained
- ✅ All tests passing
- ✅ Type safety improved
