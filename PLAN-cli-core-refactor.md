# Plan: Extract CLI Core — Framework-Free, Tree-Shakeable Command Layer

## Why

Three consumers need the same ABsmartly business logic:
1. **CLI** (Commander.js) — needs formatted output (table, json, yaml, markdown, etc.)
2. **MCP server** — needs both raw data and formatted output (selectable format)
3. **Chrome Extension** — needs raw data only (has its own React UI)

**Goal**: Each command becomes a pure function `(client, params) → Promise<Result>` that any consumer can import. Tree-shakeable so the Chrome Extension only bundles what it uses.

**This will be done by AI in one shot. Breaking the CLI during migration is fine — it just needs to work when done.**

---

## Architecture After Refactoring

```
@absmartly/cli (same package, new export paths)
│
├── ./api-client          (EXISTING — APIClient, types, HttpClient, summarizers)
├── ./core/experiments    (NEW — pure functions for experiment operations)
├── ./core/metrics        (NEW — pure functions for metric operations)
├── ./core/goals          (NEW — ...)
├── ./core/{group}        (one per command group)
├── ./formatting          (NEW export — formatOutput, OutputFormat, OutputOptions)
├── ./config              (NEW export — loadConfig, getProfile, resolveAuth, etc.)
└── .                     (EXISTING — CLI entry point, Commander wrappers)
```

---

## Core Function Contract

```typescript
// src/core/types.ts
interface CommandResult<T> {
  data: T;                           // Raw API response
  rows?: Record<string, unknown>[];  // Summarized rows (list commands)
  detail?: Record<string, unknown>;  // Summarized entity (get commands)
  warnings?: string[];
  pagination?: { page: number; items: number; hasMore: boolean };
}
```

Every core function: `async (client: APIClient, params: TypedParams) → Promise<CommandResult<T>>`

**Rules for core files**:
- No `commander`, `chalk`, `cli-table3`, `readline` imports
- No `console.log`, `console.error`, `process.exit`
- No `getGlobalOptions()` — params passed explicitly
- `APIClient` received as argument, never created inside
- Named exports only (no `export default`)
- Import from specific files, not barrel `index.ts` (for tree-shaking)

---

## Execution Plan (All at Once)

### 1. Create `src/core/types.ts` with shared `CommandResult<T>` type

### 2. For EVERY command file in `src/commands/{group}/{action}.ts`:

**a)** Create `src/core/{group}/{action}.ts`:
- Define `{Action}{Group}Params` interface with all the options from the Commander `.option()` calls
- Move the business logic from the `.action()` handler into a pure function
- Call the appropriate `client.*` method
- Call summarizers to populate `.rows` or `.detail`
- Return `CommandResult<T>`

**b)** Rewrite `src/commands/{group}/{action}.ts` as a thin Commander wrapper:
```typescript
import { listExperiments } from '../../core/experiments/list.js';

listCommand.action(withErrorHandling(async (options) => {
  const globalOptions = getGlobalOptions(listCommand);
  const client = await getAPIClientFromOptions(globalOptions);
  const params = { /* map Commander options to typed params */ };
  const result = await listExperiments(client, params);
  printFormatted(globalOptions.raw ? result.data : result.rows, globalOptions);
}));
```

**c)** Create `src/core/{group}/index.ts` barrel re-exporting all functions for that group.

### 3. All command groups to extract (do them all):

| Group | Subcommands |
|-------|-------------|
| `experiments` | list, get, create, update, start, stop, archive, restart, development, full-on, clone, diff, export, search, watch, bulk, schedule, metrics, annotations, alerts, access, follow, parent, recommendations, estimate-participants, refresh-fields, request-update, generate-template, custom-fields |
| `metrics` | list, get, create, update, archive, activate, review, access, follow |
| `goals` | list, get, create, update, access, follow |
| `segments` | list, get, create, update, archive |
| `teams` | list, get, create, update, archive, members |
| `users` | list, get, create, update, reset-password, api-keys |
| `apps` | list, get, create, update, archive |
| `envs` | list, get, create, update |
| `units` | list, get, create, update, archive |
| `tags` | list, get, create, update (+ goal-tags, metric-tags) |
| `metric-categories` | list, get, create, update, archive |
| `auth` | login, logout, status, whoami, create-api-key, list-api-keys |
| `api-keys` | list, get, create, update, delete |
| `webhooks` | list, get, create, update, delete |
| `roles` | list, get, create, update, delete |
| `permissions` | list, list-categories |
| `asset-roles` | list, get, create, update, delete |
| `notifications` | get, mark-seen, mark-read, has-new |
| `favorites` | follow/unfollow/favorite experiments, metrics, goals |
| `insights` | velocity, decision |
| `cors` | list, get, create, update, delete |
| `datasources` | list, get, create, update, archive, test, introspect, validate |
| `export-configs` | list, get, create, update, archive, pause, histories |
| `update-schedules` | list, get, create, update, delete |
| `custom-fields` | list, get, create, update, archive |
| `custom-sections` | list, create, update, archive, reorder |
| `platform-config` | list, get, update |
| `annotations` | list, create, update, archive |
| `activity` | feed |
| `statistics` | (whatever subcommands exist) |

### 4. Export formatting module

Create `src/formatting/index.ts`:
```typescript
export { formatOutput, type OutputFormat, type OutputOptions } from '../lib/output/formatter.js';
```

### 5. Export config module

Create `src/config-export/index.ts`:
```typescript
export { loadConfig, getProfile } from '../lib/config/config.js';
export { getAPIKey, getOAuthToken } from '../lib/config/keyring.js';
export { resolveAuth, resolveEndpoint, resolveAPIKey, type GlobalOptions } from '../lib/utils/api-helper.js';
export { createAPIClient } from '../lib/api/client.js';
```

### 6. Update `package.json`

```json
{
  "sideEffects": false,
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./api-client": { "types": "./dist/api-client/index.d.ts", "default": "./dist/api-client/index.js" },
    "./core/*": { "types": "./dist/core/*/index.d.ts", "default": "./dist/core/*/index.js" },
    "./formatting": { "types": "./dist/formatting/index.d.ts", "default": "./dist/formatting/index.js" },
    "./config": { "types": "./dist/config-export/index.d.ts", "default": "./dist/config-export/index.js" }
  },
  "typesVersions": {
    "*": {
      "api-client": ["./dist/api-client/index.d.ts"],
      "core/*": ["./dist/core/*/index.d.ts"],
      "formatting": ["./dist/formatting/index.d.ts"],
      "config": ["./dist/config-export/index.d.ts"]
    }
  }
}
```

---

## Tree-Shaking Requirements

- Named exports only (no `export default`)
- No module-level side effects in core files
- Core files import from specific files (`../../api-client/experiment-summary.js`), NOT barrel files (`../../api-client/index.js`)
- No CLI-only deps (chalk, cli-table3, commander, readline) in core files
- `"sideEffects": false` in package.json

---

## Concrete Example: `experiments/list`

**Before** (`src/commands/experiments/list.ts` — 124 lines, coupled to Commander):
```typescript
export const listCommand = new Command('list')
  .option('--state <state>', '...')
  // ... 40 options
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);  // ← Commander coupling
    const client = await getAPIClientFromOptions(globalOptions);
    // ... 60 lines of business logic, date parsing, API call, summarization
    printFormatted(rows, globalOptions);  // ← output coupling
  }));
```

**After — Core** (`src/core/experiments/list.ts`):
```typescript
import type { APIClient } from '../../api-client/api-client.js';
import { summarizeExperimentRow } from '../../api-client/experiment-summary.js';
import type { CommandResult } from '../types.js';
import type { ListOptions } from '../../api-client/types.js';

export interface ListExperimentsParams {
  state?: string;
  type?: string;
  search?: string;
  items?: number;
  page?: number;
  sort?: string;
  ascending?: boolean;
  application?: string;
  // ... all options as typed fields
  show?: string[];
  exclude?: string[];
}

export async function listExperiments(
  client: APIClient,
  params: ListExperimentsParams
): Promise<CommandResult<unknown[]>> {
  const listOptions: ListOptions = {
    page: params.page ?? 1,
    items: params.items ?? 20,
    previews: true,
    ...(params.state && { state: params.state }),
    ...(params.type && { type: params.type }),
    // ... map all params
  };

  const data = await client.listExperiments(listOptions);
  const rows = data.map(e => summarizeExperimentRow(e, params.show ?? [], params.exclude ?? []));

  return {
    data,
    rows,
    pagination: { page: params.page ?? 1, items: params.items ?? 20, hasMore: data.length >= (params.items ?? 20) },
  };
}
```

**After — Commander wrapper** (`src/commands/experiments/list.ts`):
```typescript
import { listExperiments } from '../../core/experiments/list.js';

listCommand.action(withErrorHandling(async (options) => {
  const globalOptions = getGlobalOptions(listCommand);
  const client = await getAPIClientFromOptions(globalOptions);
  const result = await listExperiments(client, {
    state: options.state,
    type: options.type || getDefaultType(),
    search: options.search,
    items: options.items,
    page: options.page,
    // ... direct mapping
    show: options.show,
    exclude: options.exclude,
  });

  if (isStdoutPiped() && globalOptions.output === 'table') {
    for (const exp of result.data) console.log(exp.id);
    return;
  }
  printFormatted(globalOptions.raw ? result.data : result.rows, globalOptions);
  printPaginationFooter(result.data.length, result.pagination?.items ?? 20, result.pagination?.page ?? 1, globalOptions.output);
}));
```

---

## Verification

When done, run:
```bash
npm run build          # TypeScript compiles
npm test               # existing tests pass
abs experiments list   # CLI still works end-to-end
```

The key check: `import { listExperiments } from '@absmartly/cli/core/experiments'` works from an external consumer without pulling in Commander or chalk.

---

## File Structure After Migration

```
src/
├── index.ts                    # CLI entry (unchanged)
├── api-client/                 # API client (unchanged)
├── core/                       # NEW — pure business logic
│   ├── types.ts                # CommandResult<T>
│   ├── experiments/
│   │   ├── index.ts            # barrel
│   │   ├── list.ts
│   │   ├── get.ts
│   │   ├── create.ts
│   │   ├── clone.ts
│   │   ├── diff.ts
│   │   ├── start.ts
│   │   ├── stop.ts
│   │   └── ... (one file per subcommand)
│   ├── metrics/
│   ├── goals/
│   ├── segments/
│   ├── teams/
│   ├── users/
│   ├── apps/
│   ├── envs/
│   ├── units/
│   ├── tags/
│   ├── auth/
│   └── ... (one dir per command group)
├── formatting/
│   └── index.ts                # re-exports formatOutput
├── config-export/
│   └── index.ts                # re-exports config helpers
├── commands/                   # Commander wrappers (thin)
└── lib/                        # CLI-only utilities
```
