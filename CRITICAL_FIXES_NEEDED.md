# Critical Error Handling Fixes Required

## Top 6 Most Critical Issues

These issues can cause **data loss**, **process hangs**, or **security vulnerabilities**. They should be fixed immediately.

---

## 1. Config File Race Condition (CRITICAL)

**File**: src/lib/config/config.ts
**Functions**: saveConfig(), loadConfig()

### Problem
Multiple processes can corrupt config file by reading/writing simultaneously.

### Fix
Use atomic write pattern:

```typescript
import { renameSync } from 'fs';

export function saveConfig(config: Config): void {
  try {
    ensureConfigDir();
    const path = getConfigPath();
    const tempPath = path + '.tmp';
    const content = yaml.dump(config, { indent: 2, lineWidth: 120 });
    
    // Write to temp file
    writeFileSync(tempPath, content, { encoding: 'utf8', mode: 0o600 });
    
    // Atomic rename (overwrites original)
    renameSync(tempPath, path);
  } catch (error) {
    // Clean up temp file on error
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {}
    
    // existing error handling...
  }
}
```

---

## 2. Template File Size Limit (CRITICAL)

**File**: src/lib/template/parser.ts
**Function**: parseExperimentFile()

### Problem
Reading huge files can crash Node.js with OOM error.

### Fix
Add file size check:

```typescript
import { statSync } from 'fs';

export function parseExperimentFile(filePath: string): ExperimentTemplate {
  let content: string;
  try {
    // Check file size BEFORE reading
    const stats = statSync(filePath);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(
        `Template file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB\n` +
        `Maximum allowed: 10MB\n` +
        `File: ${filePath}`
      );
    }
    
    if (stats.size === 0) {
      throw new Error(`Template file is empty: ${filePath}`);
    }
    
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    // existing error handling...
  }
  // rest of function...
}
```

---

## 3. ReDoS Vulnerability (CRITICAL)

**File**: src/lib/template/parser.ts
**Function**: parseVariants()

### Problem
Regex can hang indefinitely on malicious input.

### Fix
Add timeout protection:

```typescript
function parseVariants(content: string): VariantTemplate[] {
  const variants: VariantTemplate[] = [];
  const startTime = Date.now();
  const TIMEOUT_MS = 5000; // 5 seconds
  const MAX_ITERATIONS = 1000;
  
  const variantPattern = /### variant_(\d+)\s*\n([\s\S]*?)(?=###|$)/g;
  let match;
  let iterations = 0;
  
  while ((match = variantPattern.exec(content)) !== null) {
    iterations++;
    
    if (iterations > MAX_ITERATIONS) {
      throw new Error(
        `Template parsing exceeded ${MAX_ITERATIONS} iterations.\n` +
        `The template may be too complex or malformed.`
      );
    }
    
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error(
        `Template parsing timeout after ${TIMEOUT_MS}ms.\n` +
        `The template may be too large.`
      );
    }
    
    // existing parsing logic...
  }
  
  return variants;
}
```

---

## 4. Circular Reference in JSON (CRITICAL)

**File**: src/lib/output/formatter.ts
**Function**: formatValue()

### Problem
JSON.stringify crashes on circular references.

### Fix
Add try-catch:

```typescript
export function formatValue(value: unknown, options: OutputOptions = {}): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return truncateText(value, options);
  if (Array.isArray(value)) return value.map((v) => formatValue(v, options)).join(', ');
  
  if (isObject(value)) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('circular')) {
          return '[Circular Reference]';
        }
        if (error.message.includes('BigInt')) {
          return '[BigInt - cannot serialize]';
        }
      }
      return '[Complex object - cannot serialize]';
    }
  }
  
  return String(value);
}
```

---

## 5. JSON Size Limit in API Command (CRITICAL)

**File**: src/commands/api/index.ts
**Function**: action handler

### Problem
User can pass huge JSON causing OOM.

### Fix
Check size before parsing:

```typescript
let data: unknown;
if (options.data) {
  const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB
  
  if (options.data.length > MAX_JSON_SIZE) {
    throw new Error(
      `JSON data too large: ${(options.data.length / 1024 / 1024).toFixed(2)}MB\n` +
      `Maximum allowed: 10MB\n` +
      `Consider using a file or reducing payload size.`
    );
  }
  
  try {
    data = JSON.parse(options.data);
  } catch (parseError) {
    // existing error handling
  }
}
```

---

## 6. Setup Partial Configuration (CRITICAL)

**File**: src/commands/setup/index.ts
**Function**: action handler

### Problem
If API test fails after saving key, user left in inconsistent state.

### Fix
Rollback on failure:

```typescript
try {
  const apps = await client.listApplications();
  console.log(chalk.green('✓ Connection successful\n'));
  
  // Build profile...
  
  // Save BOTH or rollback
  try {
    await setAPIKey(apiKey, 'default');
    setProfile('default', profile);
    
    console.log(chalk.green('\n✓ Setup complete!\n'));
    // success messages...
  } catch (saveError) {
    // Rollback API key
    try {
      await deleteAPIKey('default');
    } catch {}
    
    throw new Error(
      `Failed to save configuration: ${saveError instanceof Error ? saveError.message : 'unknown'}\n` +
      `No changes were made.`
    );
  }
} catch (error) {
  console.log(chalk.red('✗ Connection failed:'), error instanceof Error ? error.message : error);
  console.log(chalk.yellow('\nPlease verify your API key and endpoint.'));
  process.exit(1);
}
```

---

## Additional High Priority Fixes

### 7. Pagination Safety Limits

**File**: src/commands/generate/index.ts

Add max pages and max items to prevent infinite loops:

```typescript
const MAX_PAGES = 1000;
const MAX_EXPERIMENTS = 100000;
let pageCount = 0;

while (hasMore) {
  pageCount++;
  
  if (pageCount > MAX_PAGES) {
    throw new Error(`Pagination limit reached (${MAX_PAGES} pages)`);
  }
  
  const batch = await client.listExperiments({ limit, offset });
  allExperiments.push(...batch);
  
  if (allExperiments.length > MAX_EXPERIMENTS) {
    throw new Error(`Too many experiments (${MAX_EXPERIMENTS}+)`);
  }
  
  if (batch.length < limit) {
    hasMore = false;
  } else {
    offset += limit;
  }
}
```

### 8. Add withErrorHandling to Config Commands

**File**: src/commands/config/index.ts

Wrap all command actions:

```typescript
const listCommand = new Command('list')
  .description('List all configuration values')
  .option('--profile <name>', 'profile name')
  .action(withErrorHandling(async (options) => {  // ADD THIS
    // existing code...
  }));
```

### 9. Delete Profile Confirmation

**File**: src/commands/config/index.ts

Add confirmation prompt:

```typescript
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

profilesCommand
  .command('delete')
  .description('Delete a profile')
  .argument('<name>', 'profile name')
  .option('-y, --yes', 'skip confirmation')
  .action(withErrorHandling(async (name: string, options) => {
    const config = loadConfig();
    
    if (!config.profiles[name]) {
      throw new Error(`Profile "${name}" not found`);
    }
    
    if (!options.yes) {
      const rl = readline.createInterface({ input, output });
      try {
        const answer = await rl.question(
          `Delete profile "${name}"? This cannot be undone. [y/N]: `
        );
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('Cancelled.');
          return;
        }
      } finally {
        rl.close();
      }
    }
    
    deleteProfile(name);
    
    // Also delete API key
    try {
      await deleteAPIKey(name);
      console.log(`✓ Deleted profile "${name}" and API key`);
    } catch {
      console.log(`✓ Deleted profile "${name}"`);
    }
  }));
```

---

## Testing Each Fix

For each fix, add tests:

1. Unit test for the specific edge case
2. Integration test for real-world scenario
3. Error message verification

Example test for file size limit:

```typescript
describe('parseExperimentFile', () => {
  it('should reject files larger than 10MB', () => {
    // Create 11MB file
    const largePath = '/tmp/large-template.md';
    const largeContent = 'x'.repeat(11 * 1024 * 1024);
    writeFileSync(largePath, largeContent);
    
    expect(() => parseExperimentFile(largePath)).toThrow(/too large/i);
    
    unlinkSync(largePath);
  });
});
```

---

## Implementation Order

1. Fix #1 (config race condition) - foundational
2. Fix #2, #5 (size limits) - prevent crashes
3. Fix #3 (ReDoS) - security
4. Fix #4 (circular refs) - stability
5. Fix #6 (setup rollback) - data integrity
6. Fix #7-9 (remaining high priority)

Each fix is independent and can be done in separate commits.
