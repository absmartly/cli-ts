# Migration Guide: Go to TypeScript

This guide shows how to continue porting commands from the Go version to TypeScript.

## Pattern: Porting a Command

### Step 1: Review the Go Implementation

```bash
# Check the Go command file
cat ~/git_tree/absmartly-cli/cmd/goals/goals.go
```

### Step 2: Create TypeScript Command Structure

```typescript
// src/commands/goals/index.ts
import { Command } from 'commander';

export const goalsCommand = new Command('goals')
  .alias('goal')
  .description('Goal commands');

// Add subcommands
goalsCommand.addCommand(listCommand);
goalsCommand.addCommand(getCommand);
goalsCommand.addCommand(createCommand);
```

### Step 3: Implement List Command

```typescript
// src/commands/goals/list.ts
import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const listCommand = new Command('list')
  .description('List goals')
  .option('--limit <number>', 'maximum number of results', parseInt, 100)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const goals = await client.listGoals(options.limit, options.offset);

      const output = formatOutput(goals, globalOptions.output as any, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
```

### Step 4: Add API Client Method (if needed)

```typescript
// src/lib/api/client.ts
async listGoals(limit = 100, offset = 0): Promise<Goal[]> {
  const response = await this.client.get<{ goals: Goal[] }>('/goals', {
    params: { limit, offset },
  });
  return response.data.goals;
}
```

### Step 5: Add Tests

```typescript
// src/commands/goals/__tests__/list.test.ts
import { describe, it, expect } from 'vitest';
import { APIClient } from '../../../lib/api/client.js';

describe('goals list', () => {
  it('should list goals', async () => {
    const client = new APIClient('https://api.absmartly.com/v1', 'test-key');
    const goals = await client.listGoals(10);

    expect(goals).toBeDefined();
    expect(Array.isArray(goals)).toBe(true);
  });
});
```

### Step 6: Add Mock Handler

```typescript
// src/test/mocks/handlers.ts
http.get(`${BASE_URL}/goals`, () => {
  const goals = createMockGoals(10);
  return HttpResponse.json({ goals });
}),
```

### Step 7: Register Command

```typescript
// src/index.ts
import { goalsCommand } from './commands/goals/index.js';

program.addCommand(goalsCommand);
```

## Common Patterns

### Command with Required Argument

```typescript
.argument('<id>', 'resource ID', parseInt)
.action(async (id: number, options) => {
  // Use id
})
```

### Command with Optional Flags

```typescript
.option('--name <name>', 'resource name')
.option('--archived', 'include archived')
```

### Boolean Flags

```typescript
.option('--include-archived', 'include archived resources')

// Access in action
if (options.includeArchived) {
  // Do something
}
```

### Multiple Values (comma-separated)

```typescript
.option('--teams <ids>', 'team IDs (comma-separated)')

// Parse in action
const teamIds = options.teams?.split(',').map(Number);
```

### Date/Timestamp Parsing

```typescript
// TODO: Add date parsing utility
.option('--created-after <timestamp>', 'created after date')

// For now, accept milliseconds or ISO 8601
const timestamp = parseInt(options.createdAfter) || Date.parse(options.createdAfter);
```

## Go to TypeScript Equivalents

### Types

| Go | TypeScript |
|----|-----------|
| `type Foo struct { Bar string }` | `interface Foo { bar: string }` |
| `*time.Time` | `string` (ISO 8601) or `Date` |
| `json.RawMessage` | `unknown` or `any` |
| `map[string]string` | `Record<string, string>` |
| `[]Foo` | `Foo[]` or `Array<Foo>` |
| `*int` | `number \| undefined` |

### Error Handling

```go
// Go
if err != nil {
    return err
}
```

```typescript
// TypeScript
try {
  await someMethod();
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
```

### HTTP Requests

```go
// Go (Resty)
resp, err := client.R().
    SetResult(&result).
    SetQueryParam("limit", "10").
    Get("/experiments")
```

```typescript
// TypeScript (axios)
const response = await client.get<{ experiments: Experiment[] }>('/experiments', {
  params: { limit: 10 },
});
const experiments = response.data.experiments;
```

### Configuration

```go
// Go (Viper)
viper.GetString("endpoint")
viper.GetBool("verbose")
```

```typescript
// TypeScript
const config = loadConfig();
const profile = getProfile(profileName);
console.log(profile.api.endpoint);
```

## Reference Commands

### Simple Command (Version)
- Go: `~/git_tree/absmartly-cli/cmd/version/version.go`
- TS: `~/git_tree/absmartly-cli-ts/src/commands/version/index.ts`

### Command Group (Auth)
- Go: `~/git_tree/absmartly-cli/cmd/auth/auth.go`
- TS: `~/git_tree/absmartly-cli-ts/src/commands/auth/index.ts`

### Complex Command (Experiments List)
- Go: `~/git_tree/absmartly-cli/cmd/experiments/experiments.go`
- TS: `~/git_tree/absmartly-cli-ts/src/commands/experiments/list.ts`

## Testing Patterns

### API Client Test

```typescript
describe('APIClient', () => {
  const client = new APIClient('https://api.absmartly.com/v1', 'test-key');

  it('should fetch resources', async () => {
    const resources = await client.listResources();
    expect(resources).toBeDefined();
    expect(Array.isArray(resources)).toBe(true);
  });
});
```

### Command Test (Integration)

```typescript
import { server } from '../../../test/mocks/server.js';

describe('goals list command', () => {
  it('should display goals', async () => {
    // Mock is already set up via MSW
    const client = new APIClient('https://api.absmartly.com/v1', 'test-key');
    const goals = await client.listGoals();

    expect(goals.length).toBeGreaterThan(0);
  });
});
```

### Override Mock for Specific Test

```typescript
it('should handle errors', async () => {
  server.use(
    http.get('https://api.absmartly.com/v1/goals', () => {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    })
  );

  // Test error handling...
});
```

## Next Commands to Port

### Priority 1 (High Usage)
1. ✅ experiments list, get, search
2. goals (list, get, create, update, delete)
3. teams (list, get, create, update, archive)
4. users (list, get, create, update, archive)
5. metrics (list, get, create, update, archive)

### Priority 2 (Core Features)
6. experiments create, update, start, stop, archive
7. experiments alerts (list, delete-all)
8. experiments notes (list, create, timeline)
9. experiments activity list
10. segments (list, get, create, update, delete)

### Priority 3 (Additional Features)
11. tags (list, get, create, update, delete)
12. apps, envs, units (list, get)
13. roles, permissions (list, get)
14. api-keys (list, get, create, delete)
15. webhooks (list, get, create, update, delete)

### Priority 4 (Advanced Features)
16. generate types
17. setup wizard
18. doctor diagnostics
19. open in browser
20. raw api command
21. shell completion

## Estimated Effort

Based on what's been completed:

- **Simple commands** (list, get): ~15 minutes each
- **CRUD commands** (create, update, delete): ~30 minutes each
- **Complex commands** (with nested subcommands): ~1 hour each
- **Utility commands** (setup, doctor, generate): ~2 hours each

**Total remaining**: ~15-20 hours for full parity with Go version
