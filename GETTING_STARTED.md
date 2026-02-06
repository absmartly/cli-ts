# Getting Started with ABSmartly CLI (TypeScript)

## Quick Start

### 1. Install Dependencies

```bash
cd ~/git_tree/absmartly-cli-ts
npm install
```

### 2. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 3. Test the CLI

```bash
# Show version
node dist/index.js version

# Show help
node dist/index.js --help

# Show experiments help
node dist/index.js experiments --help
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Development Workflow

### Build + Watch

```bash
# Terminal 1: Build in watch mode
npm run build:watch

# Terminal 2: Run CLI
node dist/index.js experiments list
```

### Run in Development Mode

```bash
# Run directly with tsx (no build needed)
npm run dev -- experiments list
npm run dev -- version
npm run dev -- --help
```

### Type Checking

```bash
npm run typecheck
```

### Code Formatting

```bash
npm run format
```

## Testing the CLI with Mock API

The project uses MSW (Mock Service Worker) for testing, which intercepts network requests:

```bash
# All tests use mocked API responses
npm test

# Tests automatically use handlers from src/test/mocks/handlers.ts
# Mock data is generated using factories in src/test/mocks/factories.ts
```

## Using the API Mocks Project

The `~/git_tree/absmartly-api-mocks` project provides:
- OpenAPI specification
- Type-safe mock handlers
- Factory functions for generating test data

To use it in this project:

1. **Import types** (already done in `src/lib/api/types.ts`)
2. **Use MSW handlers** (already configured in `src/test/mocks/`)
3. **Generate mock data** (using factories in `src/test/mocks/factories.ts`)

## Project Structure

```
src/
├── index.ts                    # CLI entry point
├── commands/                   # Command implementations
│   ├── experiments/
│   │   ├── index.ts           # Command group
│   │   ├── list.ts            # List experiments
│   │   ├── get.ts             # Get experiment
│   │   └── search.ts          # Search experiments
│   ├── auth/index.ts          # Auth commands
│   ├── config/index.ts        # Config commands
│   └── version/index.ts       # Version command
├── lib/
│   ├── api/
│   │   ├── types.ts           # TypeScript types
│   │   ├── client.ts          # API client
│   │   └── client.test.ts     # Client tests
│   ├── config/
│   │   ├── config.ts          # YAML config management
│   │   └── keyring.ts         # Secure storage
│   ├── output/
│   │   └── formatter.ts       # Output formatters
│   └── utils/
│       ├── version.ts         # Version info
│       └── api-helper.ts      # Helper functions
└── test/
    ├── setup.ts               # Test setup
    └── mocks/
        ├── server.ts          # MSW server
        ├── handlers.ts        # API handlers
        └── factories.ts       # Mock factories
```

## Adding New Commands

### 1. Create Command File

```typescript
// src/commands/goals/index.ts
import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const goalsCommand = new Command('goals')
  .alias('goal')
  .description('Goal commands');

const listCommand = new Command('list')
  .description('List goals')
  .option('--limit <number>', 'maximum results', parseInt, 100)
  .action(async (options) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const goals = await client.listGoals(options.limit);

    const output = formatOutput(goals, globalOptions.output as any, {
      noColor: globalOptions.noColor,
      full: globalOptions.full,
      terse: globalOptions.terse,
    });

    console.log(output);
  });

goalsCommand.addCommand(listCommand);
```

### 2. Register Command

```typescript
// src/index.ts
import { goalsCommand } from './commands/goals/index.js';

program.addCommand(goalsCommand);
```

### 3. Add Tests

```typescript
// src/commands/goals/__tests__/list.test.ts
import { describe, it, expect } from 'vitest';
// Add tests...
```

## Adding API Methods

### 1. Add Types

```typescript
// src/lib/api/types.ts
export interface NewResource {
  id: number;
  name: string;
}
```

### 2. Add Client Method

```typescript
// src/lib/api/client.ts
async listNewResources(): Promise<NewResource[]> {
  const response = await this.client.get<{ resources: NewResource[] }>('/resources');
  return response.data.resources;
}
```

### 3. Add Mock Handler

```typescript
// src/test/mocks/handlers.ts
http.get(`${BASE_URL}/resources`, () => {
  return HttpResponse.json({ resources: [] });
})
```

## Common Tasks

### Add a New Flag to a Command

```typescript
.option('--my-flag <value>', 'description')
```

### Access Global Flags

```typescript
const globalOptions = getGlobalOptions(command);
console.log(globalOptions.output);  // table, json, yaml, etc.
console.log(globalOptions.profile); // Profile name
console.log(globalOptions.verbose); // Verbose mode
```

### Handle Errors

```typescript
try {
  await client.someMethod();
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
```

### Format Output

```typescript
const output = formatOutput(data, 'json', {
  noColor: false,
  full: true,
  terse: false,
});
console.log(output);
```

## Differences from Go Version

### Advantages
- **Type Safety**: Compile-time type checking
- **Better Testing**: MSW intercepts actual HTTP requests
- **Faster Iteration**: Watch mode, hot reload
- **npm Distribution**: Easy global installation
- **Modern Tooling**: Vitest, ESLint, Prettier

### Trade-offs
- **Binary Size**: Larger than Go compiled binary (includes Node.js)
- **Startup Time**: Slightly slower than compiled Go
- **Dependencies**: Requires Node.js runtime

### Mitigations
- Can create standalone binaries with tools like `pkg` or `ncc`
- Can optimize for smaller bundle size
- Node.js is commonly available on developer machines

## Performance

### Build Time
- Initial: ~1-2 seconds
- Incremental (watch): ~100-300ms

### Test Time
- 6 tests: ~300ms
- Fast feedback loop with watch mode

### Runtime
- CLI startup: ~100-200ms
- API calls: Same as Go version (network-bound)

## Contributing

When adding features:

1. **Port from Go**: Check the corresponding Go file
2. **Add Types**: Update `src/lib/api/types.ts` if needed
3. **Add Tests**: Write tests using MSW
4. **Update Docs**: Keep README.md current
5. **Format Code**: Run `npm run format`
6. **Type Check**: Run `npm run typecheck`

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Test Failures

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- src/lib/api/client.test.ts
```

### Module Resolution Issues

Ensure all imports use `.js` extensions:
```typescript
import { something } from './module.js';  // ✓ Correct
import { something } from './module';     // ✗ Wrong
```

## Integration with API Mocks

The `~/git_tree/absmartly-api-mocks` project provides:

```typescript
// Already integrated in src/test/mocks/
import { createMockExperiment } from './factories.js';
```

To add more mocks from the api-mocks project:

1. Copy factory functions from `api-mocks/src/factories/`
2. Copy handlers from `api-mocks/src/mocks/handlers.ts`
3. Adapt to match this project's structure

## Resources

- [Commander.js Docs](https://github.com/tj/commander.js)
- [Vitest Docs](https://vitest.dev)
- [MSW Docs](https://mswjs.io)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
