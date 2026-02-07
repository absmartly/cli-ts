# ABSmartly CLI TypeScript - Comprehensive Test Coverage Analysis

**Analysis Date:** 2026-02-06  
**Current State:** 213 tests passing, 75% coverage (estimated)  
**Test Files:** 16 test files  
**Source Files:** 59 TypeScript files  
**Critical Gap:** Only 1 command integration test out of 40+ command files

---

## Executive Summary

The codebase has solid unit test coverage for core API and library functions (75%), but has **critical gaps** in:

1. **Command integration testing** (97.5% untested - only 1 of 40 commands tested)
2. **Error path coverage** in critical flows
3. **Edge case handling** in parsers and validators
4. **Retry logic** completeness
5. **Config file** corruption scenarios

**Severity Rating: 8/10** - The lack of command integration tests is a production risk. Commands are the user-facing API and bugs here cause immediate user pain.

---

## 1. CRITICAL GAPS - Must Fix (Rating: 8-10)

### 1.1 Command Integration Tests (Criticality: 10/10)

**Current State:** Only `experiments/list.test.ts` has integration tests. 39 other command files are untested.

**Files Affected:** All files in `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/`

#### Priority Commands Needing Tests:

**1. Authentication (auth/index.ts)** - Criticality: 10/10
- Login with invalid API key format
- Keyring access denied handling
- Profile name validation (prevent path traversal)
- Endpoint URL normalization
- Status command when not authenticated
- API key masking in output

**2. Config Management (config/index.ts)** - Criticality: 9/10
- Prototype pollution prevention (__proto__, constructor.prototype)
- Nested key path validation
- YAML special value handling
- Core key deletion protection
- Non-existent key deletion

**3. Experiment Creation (experiments/create.ts)** - Criticality: 9/10
- JSON.parse error handling (currently no try-catch on line 38)
- Variant name uniqueness validation
- Required field validation
- Template file parsing errors
- CLI argument vs file-based creation

---

### 1.2 Template Parser Error Handling (Criticality: 9/10)

**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/template/parser.ts`

**Current Coverage:** Only 3 basic tests. Missing all error paths.

**Missing Test Scenarios:**

1. **File System Errors**
   - File not found (ENOENT)
   - Permission denied (EACCES)
   - Binary file detection
   - Extremely large files (DoS protection)

2. **YAML Parsing Errors**
   - Invalid frontmatter syntax
   - Corrupted YAML mid-file
   - Empty files
   - Comment-only files

3. **Variant Parsing**
   - Malformed variant sections
   - Non-sequential variant indices
   - Duplicate variant names
   - Special characters in variant names

4. **Platform Compatibility**
   - Windows vs Unix line endings (\r\n vs \n)
   - Unicode character handling
   - Path separator differences

**Example Test:**

```typescript
describe('parseExperimentFile - Error Handling', () => {
  it('should handle file not found with clear message', async () => {
    await expect(
      parseExperimentFile('/nonexistent/file.md')
    ).rejects.toThrow(/Template file not found/);
  });

  it('should handle permission denied gracefully', async () => {
    const file = createUnreadableFile();
    await expect(
      parseExperimentFile(file)
    ).rejects.toThrow(/Permission denied.*chmod/);
  });

  it('should validate variant indices are sequential', async () => {
    const template = `
## Variants
### variant_0
name: control
### variant_2
name: treatment
`;
    writeFile('non-sequential.md', template);
    await expect(
      parseExperimentFile('non-sequential.md')
    ).rejects.toThrow(/variant.*indices.*sequential/i);
  });
});
```

**Bugs This Would Catch:**
- Runtime crashes on malformed files
- Cryptic error messages for common mistakes
- Security issues from special characters
- Platform-specific parsing inconsistencies

---

### 1.3 API Client Retry Logic (Criticality: 8/10)

**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/api/client.ts`

**Current Issue:** Lines 52-61 configure retry logic, but may retry non-idempotent operations.

**Critical Gap:** POST operations to start/stop experiments (lines 204-218) should NEVER retry on 500 errors, but current retry logic on line 58 may allow it.

**Missing Tests:**

```typescript
describe('APIClient - Retry Logic', () => {
  it('should NOT retry POST /experiments/:id/start', async () => {
    let attempts = 0;
    mockServer.use(
      http.post('/experiments/123/start', () => {
        attempts++;
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    await client.startExperiment(123).catch(() => {});
    
    // CRITICAL: Retrying causes double-start
    expect(attempts).toBe(1);
  });

  it('should NOT retry POST /experiments/:id/stop', async () => {
    let attempts = 0;
    mockServer.use(
      http.post('/experiments/123/stop', () => {
        attempts++;
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    await client.stopExperiment(123).catch(() => {});
    expect(attempts).toBe(1);
  });

  it('should respect Retry-After header for 429 responses', async () => {
    let attempts = 0;
    mockServer.use(
      http.get('/experiments', () => {
        attempts++;
        if (attempts === 1) {
          return new HttpResponse(null, {
            status: 429,
            headers: { 'Retry-After': '2' }
          });
        }
        return HttpResponse.json({ experiments: [] });
      })
    );

    const start = Date.now();
    await client.listExperiments();
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThanOrEqual(2000);
  });

  it('should use exponential backoff correctly', async () => {
    const timestamps: number[] = [];
    mockServer.use(
      http.get('/experiments', () => {
        timestamps.push(Date.now());
        if (timestamps.length < 3) {
          return HttpResponse.error();
        }
        return HttpResponse.json({ experiments: [] });
      })
    );

    await client.listExperiments();

    const delay1 = timestamps[1] - timestamps[0];
    const delay2 = timestamps[2] - timestamps[1];
    expect(delay2).toBeGreaterThan(delay1);
  });
});
```

**Bugs This Would Catch:**
- Double-starting experiments (data corruption)
- Double-stopping experiments (state issues)
- Not respecting rate limits
- Incorrect backoff causing server overload

---

### 1.4 Config File Security & Validation (Criticality: 8/10)

**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/config/config.ts`

**Critical Issues:**
- **Line 75:** `yaml.load(content)` without safe schema allows code execution
- **Line 76:** Shallow merge `{ ...defaultConfig(), ...config }` loses nested data

**Missing Tests:**

```typescript
describe('loadConfig - Security', () => {
  it('should use safe YAML schema to prevent code execution', async () => {
    const maliciousYaml = `
output: table
# Malicious YAML that attempts code execution
`;
    writeConfigFile(maliciousYaml);

    // Should use yaml.load(content, { schema: yaml.SAFE_SCHEMA })
    // to prevent arbitrary code execution
    expect(() => loadConfig()).not.toThrow();
  });

  it('should deep merge profiles without losing data', async () => {
    const customConfig = {
      profiles: {
        staging: {
          api: { endpoint: 'https://staging.com' },
          expctld: { endpoint: 'https://staging-ctl.com' }
        }
      }
    };

    saveConfig(customConfig as Config);
    const loaded = loadConfig();

    // Should have both default AND staging profiles
    expect(loaded.profiles.default).toBeDefined();
    expect(loaded.profiles.staging).toBeDefined();
  });

  it('should handle corrupted config file', async () => {
    const corruptYaml = `
default-profile: prod
profiles:
  prod:
    api:
      endpoint: https://prod.com
  staging`;

    writeConfigFile(corruptYaml);
    expect(() => loadConfig()).toThrow(/invalid.*yaml/i);
  });

  it('should recover from empty config file', async () => {
    writeConfigFile('');
    const config = loadConfig();
    expect(config).toEqual(defaultConfig());
  });
});

describe('saveConfig - Error Handling', () => {
  it('should handle disk full error', async () => {
    mockFsError('ENOSPC');
    const error = (() => saveConfig(defaultConfig())).catch(e => e);
    expect(error.message).toContain('Disk full');
  });

  it('should set correct file permissions (0600)', async () => {
    saveConfig(defaultConfig());
    const stats = statSync(getConfigPath());
    expect(stats.mode & 0o777).toBe(0o600);
  });
});

describe('deleteProfile - Edge Cases', () => {
  it('should update default-profile when deleting current default', async () => {
    setProfile('staging', {
      api: { endpoint: 'https://staging.com' },
      expctld: { endpoint: 'https://ctl.absmartly.io/v1' }
    });

    setDefaultProfile('staging');
    deleteProfile('staging');

    const config = loadConfig();
    expect(config['default-profile']).not.toBe('staging');
    expect(config.profiles[config['default-profile']]).toBeDefined();
  });
});
```

**Bugs This Would Catch:**
- YAML code execution vulnerability (CRITICAL)
- Losing profile data on config updates
- Config corruption leaving CLI unusable
- Incorrect file permissions exposing API keys

---

## 2. IMPORTANT GAPS - Should Fix (Rating: 5-7)

### 2.1 Keyring Platform-Specific Failures (Criticality: 7/10)

**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/config/keyring.ts`

**Missing Tests:**

1. **Linux headless environments** (CI/CD)
   - Keyring not available
   - D-Bus autolaunch errors
   - Suggest environment variable alternative

2. **macOS keychain locked**
   - User canceled operation
   - Keychain access permission denied

3. **Windows Credential Manager unavailable**
   - Service not running
   - Credential vault errors

4. **Concurrent access**
   - Multiple CLI instances
   - Race condition handling

**Example Test:**

```typescript
describe('keyring - Platform Failures', () => {
  it('should handle keyring not available on Linux headless', async () => {
    mockKeytar.getPasswordError(
      new Error('Cannot get secret: Cannot autolaunch D-Bus')
    );

    const error = await getAPIKey().catch(e => e);
    expect(error.message).toContain('keyring not available');
    expect(error.message).toContain('environment variable');
  });

  it('should handle concurrent keychain access', async () => {
    const promises = Array(10).fill(null).map((_, i) =>
      setAPIKey('test-key', `profile-${i}`)
    );

    await expect(Promise.all(promises)).resolves.not.toThrow();
  });
});
```

---

### 2.2 API Helper Validation (Criticality: 7/10)

**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/utils/api-helper.ts`

**Current Coverage:** NO TESTS for this critical file.

**Missing Tests:**

```typescript
describe('getAPIClientFromOptions', () => {
  it('should throw helpful error when API key not found', async () => {
    await deleteAPIKey();

    const error = await getAPIClientFromOptions({}).catch(e => e);

    expect(error.message).toContain('No API key found');
    expect(error.message).toContain('abs auth login');
    expect(error.message).toContain('abs setup');
  });

  it('should prefer command-line options over config', async () => {
    await setAPIKey('config-key');

    const client = await getAPIClientFromOptions({
      apiKey: 'cli-key',
      endpoint: 'https://cli.test'
    });

    expect(client).toBeDefined();
  });
});

describe('getGlobalOptions', () => {
  it('should reject invalid output format', async () => {
    const cmd = createMockCommand({ output: 'invalid-format' });

    expect(() => getGlobalOptions(cmd))
      .toThrow(/Invalid output format.*table, json, yaml, plain, markdown/);
  });

  it('should default to table format', async () => {
    const cmd = createMockCommand({});
    const options = getGlobalOptions(cmd);
    expect(options.output).toBe('table');
  });
});
```

---

### 2.3 Output Formatter Edge Cases (Criticality: 6/10)

**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/output/formatter.ts`

**Current Coverage:** Basic tests exist, missing edge cases.

**Missing Tests:**

```typescript
describe('formatter - Edge Cases', () => {
  it('should handle circular references', async () => {
    const obj: any = { name: 'test' };
    obj.self = obj;

    const result = formatOutput(obj, 'json');
    expect(result).toBeDefined();
  });

  it('should handle unicode characters', async () => {
    const data = { emoji: '🚀', chinese: '测试', arabic: 'اختبار' };
    const result = formatOutput(data, 'table');

    expect(result).toContain('🚀');
    expect(result).toContain('测试');
  });

  it('should handle extremely long strings', async () => {
    const longString = 'x'.repeat(10000);
    const data = { description: longString };

    const result = formatOutput(data, 'table', { terse: true });

    expect(result.length).toBeLessThan(longString.length);
    expect(result).toContain('...');
  });
});
```

---

## 3. COMMAND COVERAGE BREAKDOWN

### Commands WITH Tests (1/40 = 2.5%)
✅ `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/experiments/list.ts`

### Commands WITHOUT Tests (39/40 = 97.5%)

**Priority 1 - Critical User Flows:**
❌ auth/index.ts
❌ config/index.ts
❌ experiments/create.ts
❌ experiments/start.ts
❌ experiments/stop.ts
❌ experiments/get.ts

**Priority 2 - Common Operations:**
❌ experiments/update.ts
❌ experiments/delete.ts
❌ experiments/archive.ts
❌ setup/index.ts
❌ doctor/index.ts

**Priority 3 - Resource Management:**
❌ goals/index.ts
❌ metrics/index.ts
❌ segments/index.ts
❌ teams/index.ts
❌ users/index.ts

**Priority 4 - Remaining:**
❌ All other 24 command files

---

## 4. TEST IMPLEMENTATION ROADMAP

### Phase 1: Critical Security & Data Integrity (2 weeks)

**Week 1:**
1. Fix prototype pollution in config set
2. Add YAML safe schema to config loading
3. Fix retry logic for non-idempotent operations
4. Add JSON.parse error handling in experiments/create

**Week 2:**
5. Implement command test infrastructure
6. Add auth command integration tests
7. Add config command integration tests
8. Add experiments create integration tests

### Phase 2: Core Command Coverage (2 weeks)

**Week 3:**
9. experiments start/stop/archive tests
10. experiments get/update/delete tests
11. Template parser comprehensive error tests

**Week 4:**
12. setup command tests
13. doctor command tests
14. Config deep merge fix with tests

### Phase 3: Resource & Error Handling (2 weeks)

**Week 5:**
15. goals, metrics, segments CRUD tests
16. teams, users management tests
17. Keyring platform-specific error tests

**Week 6:**
18. Output formatter edge case tests
19. API helper comprehensive tests
20. Remaining utility command tests

### Phase 4: Quality & Regression (2 weeks)

**Week 7:**
21. Mock validation against real API
22. Test helper refactoring
23. Regression test suite for known bugs

**Week 8:**
24. Performance testing for large datasets
25. Cross-platform compatibility tests
26. Documentation and test maintenance guide

---

## 5. TEST INFRASTRUCTURE REQUIREMENTS

### 5.1 Command Test Runner

Create `/Users/joalves/git_tree/absmartly-cli-ts/src/test/helpers/command-runner.ts`:

```typescript
import { program } from '../../index.js';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCommand(args: string[]): Promise<CommandResult> {
  // Capture stdout, stderr, and exit code
  // Return structured result
}
```

### 5.2 File System Mocking

Create `/Users/joalves/git_tree/absmartly-cli-ts/src/test/helpers/fs-mock.ts`:

```typescript
import { vol } from 'memfs';

export function setupMockFs() {
  beforeEach(() => {
    vol.reset();
  });
}

export function writeConfigFile(content: string) {
  // Write to in-memory filesystem
}
```

### 5.3 Keyring Mocking

Create `/Users/joalves/git_tree/absmartly-cli-ts/src/test/helpers/keyring-mock.ts`:

```typescript
import { vi } from 'vitest';

export const mockKeytar = {
  passwords: new Map<string, string>(),
  setPassword: vi.fn(),
  getPassword: vi.fn(),
  deletePassword: vi.fn()
};
```

---

## 6. METRICS & TARGETS

### Current State
- Total Files: 59 TypeScript files
- Test Files: 16 (27% of source files have tests)
- Command Files: 40
- Tested Commands: 1 (2.5%)
- Estimated Coverage: 75% (library code only)

### Target State (8 weeks)
- Test Files: 50+ (85% of source files)
- Tested Commands: 40 (100%)
- Overall Coverage: >85%
- Command Coverage: >80%
- Library Coverage: >95%

### Quality Metrics
- Test Stability: >98% (non-flaky)
- Regression Prevention: <5% bugs escape
- Test Execution: <60s full suite
- Code Review: 100% new code has tests

---

## 7. KNOWN ISSUES NEEDING REGRESSION TESTS

From existing task list:

**Task #62:** ✅ COMPLETED - Falsy value bug in listExperiments
**Task #63:** ❌ PENDING - JSON.parse error in variant config
**Task #64:** ❌ PENDING - Prototype pollution in config set
**Task #65:** ❌ PENDING - Shallow merge in loadConfig
**Task #68:** ❌ PENDING - Tag update empty body issue
**Task #69:** ❌ PENDING - YAML safe schema

Add regression tests for each fixed issue to prevent recurrence.

---

## 8. SUMMARY & ACTION PLAN

### Immediate Actions (This Sprint)
1. ✅ Fix prototype pollution vulnerability (Task #64)
2. ✅ Add YAML safe schema (Task #69)
3. ✅ Fix retry logic for start/stop experiments
4. ✅ Add JSON.parse error handling (Task #63)

### Next Sprint
5. Set up command test infrastructure
6. Add auth, config, experiments/create tests
7. Fix config deep merge (Task #65)
8. Add template parser error tests

### Following Sprints
9. Complete all command integration tests
10. Add comprehensive error path coverage
11. Implement regression test suite
12. Achieve >85% overall coverage

### Critical Risks
- **Security:** Prototype pollution and YAML code execution
- **Data Integrity:** Double-start/stop from retry logic
- **User Experience:** 97.5% of commands untested
- **Maintainability:** Hard to refactor without test coverage

### ROI
- **Prevent:** Data corruption, security breaches, user lockout
- **Enable:** Safe refactoring, faster development, regression prevention
- **Improve:** Code quality, developer confidence, user trust

---

**Analysis Complete**
**Document:** `/Users/joalves/git_tree/absmartly-cli-ts/TEST_COVERAGE_ANALYSIS.md`
**Generated:** 2026-02-06
