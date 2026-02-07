# FINAL Test Coverage Audit - ABSmartly CLI TypeScript

**Date:** 2026-02-07
**Status:** 385 tests passing, 22 test files, ~85% estimated coverage
**Critical Risk Level:** HIGH - Production incidents likely without additional tests

---

## Executive Summary

While the project has excellent unit test coverage for foundational infrastructure (config, keyring, API client, template parsing, branded types), it has **CRITICAL gaps** in integration testing that could cause production failures:

- **3 of 40 commands** have integration tests (7.5%)
- **0 of ~100 data-modifying commands** tested end-to-end
- **0 auth flow tests** (login, logout, status, profile switching)
- **0 setup wizard tests** (first-time user experience)
- **0 cross-platform tests** (keyring on macOS/Linux/Windows)
- **0 concurrency tests** (multiple profiles, config file locking)

**Primary Risk:** Silent data corruption or loss when commands fail mid-operation without proper rollback/verification.

---

## Test Quality Assessment

### What's Well-Tested (95%+ coverage)

#### 1. Config Management (`/Users/joalves/git_tree/absmartly-cli-ts/src/lib/config/`)
- **Strengths:**
  - Deep merge behavior with defaults
  - YAML parsing error handling (syntax errors, permissions)
  - Disk full scenarios (ENOSPC)
  - Protected key injection prevention (__proto__, constructor)
  - Profile isolation and switching

- **Test Quality:** EXCELLENT
  - Tests behavior, not implementation
  - Would catch regressions from file format changes
  - Tests actual filesystem operations (not mocked)

#### 2. Keyring Management (`/Users/joalves/git_tree/absmartly-cli-ts/src/lib/config/keyring.test.ts`)
- **Strengths:**
  - Profile-specific key naming
  - Error handling for locked/unavailable keychain
  - Profile isolation (dev vs prod keys)

- **Test Quality:** GOOD but FRAGILE
  - Heavy mocking of keytar library
  - Would NOT catch platform-specific keyring issues
  - Missing real integration tests

#### 3. Template Parsing (`/Users/joalves/git_tree/absmartly-cli-ts/src/lib/template/parser.test.ts`)
- **Strengths:**
  - YAML frontmatter error handling
  - File not found (ENOENT), permission denied (EACCES)
  - Variant parsing with JSON config

- **Test Quality:** ADEQUATE
  - Only 3 test cases for complex parsing logic
  - Missing edge cases (malformed variant sections, duplicate variant numbers)

#### 4. Branded Types (`/Users/joalves/git_tree/absmartly-cli-ts/src/lib/api/branded-types.test.ts`)
- **Strengths:**
  - Comprehensive validation for all ID types
  - Timestamp validation
  - Type safety enforcement

- **Test Quality:** EXCELLENT

---

## CRITICAL Testing Gaps (Prioritized by Risk)

### Tier 1 - CRITICAL (Would cause production incidents)

#### 1. Auth Commands - Login/Logout/Status (Risk: 10/10)
**Location:** `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/auth/index.ts`
**Current Coverage:** 0%
**Lines of Code:** ~75

**Why Critical:**
- Authentication failures lock users out of CLI
- Incorrect keyring writes could corrupt credentials
- Profile switching bugs could expose wrong API keys to wrong endpoints

**Missing Tests:**
- Login with invalid API key (should show clear error, not save bad credentials)
- Login with unreachable endpoint (network timeout)
- Login creates profile atomically (no partial config if keyring fails)
- Logout doesn't break when keyring unavailable
- Status command when profile missing
- Status command when API key missing but config exists
- Profile switching with concurrent commands

**Example Failure Scenario:**
```typescript
// User runs: abs auth login --api-key INVALID --endpoint https://api.absmartly.com/v1
// Current code SAVES invalid key to keyring before testing connection
// Then setup wizard FAILS connection test
// Result: User is "logged in" with bad credentials, all future commands fail
```

**Effort:** 4 hours
**Priority:** MUST HAVE before 1.0

---

#### 2. Setup Wizard (Risk: 9/10)
**Location:** `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/setup/index.ts`
**Current Coverage:** 0%
**Lines of Code:** ~90

**Why Critical:**
- First-time user experience determines CLI adoption
- Readline input handling is fragile
- Network failures during app selection leave partial state

**Missing Tests:**
- Empty API key input (should reject, not save)
- Network timeout during connection test
- User cancels at application selection (Ctrl+C)
- No applications returned from API
- Invalid application selection (out of bounds)
- Readline interface cleanup on error
- Config save fails after keyring save (orphaned key)

**Example Failure Scenario:**
```typescript
// User runs: abs setup
// Enters API key, endpoint validates successfully
// During application listing: Network timeout
// Current code: process.exit(1) AFTER saving API key to keyring
// Result: Keyring has key, config file missing - corrupted state
```

**Effort:** 6 hours
**Priority:** MUST HAVE before 1.0

---

#### 3. Data-Modifying Commands - Create/Update/Delete (Risk: 9/10)
**Commands Affected:**
- `experiments create/update/delete/start/stop/archive` (6 commands)
- `segments create/update/delete` (3 commands)
- `goals create/update/delete` (3 commands)
- ~30 more across other resources

**Current Coverage:** 1 command has superficial test (`experiments create`)
**Total Missing:** ~95 commands untested

**Why Critical:**
- Silent failures could delete production experiments
- Partial updates (some fields succeed, others fail)
- No confirmation prompts for destructive operations
- No rollback on failure

**Missing Tests for EACH create/update/delete command:**
- Invalid ID format (should fail fast with clear error)
- API returns 404 (resource not found)
- API returns 403 (permission denied)
- Network timeout mid-request
- Partial response (200 OK but missing fields)
- Template file with invalid JSON in variant config
- Required fields missing
- Concurrent modifications (race conditions)

**Example Failure Scenario:**
```typescript
// User runs: abs experiments delete 12345
// API returns 500 Internal Server Error
// Current code: Shows generic "API error"
// Result: User doesn't know if experiment was deleted or not
// They run command again -> might delete different experiment if ID was wrong
```

**Effort:** 2 hours per command = ~200 hours for full coverage
**Priority:** At minimum, test experiments/segments/goals commands (24 hours)

---

#### 4. Template Parsing with Experiment Create (Risk: 8/10)
**Location:** `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/experiments/create.ts`
**Current Test:** Only validates error message text exists, NOT behavior
**Lines of Code:** ~77

**Why Critical:**
- JSON.parse errors in variant configs lose user work
- File I/O errors during template read
- YAML parsing errors in frontmatter

**Missing Tests:**
- Invalid JSON in variant config shows WHICH variant and line number
- Very large JSON (>100 chars) is truncated in error message
- Multiple variants with mixed valid/invalid JSON
- Template file doesn't exist
- Template file not readable (permissions)
- Template creates experiment with all fields from file
- Template overrides work with --name flag

**Current Test is Documentation Test (Anti-Pattern):**
```typescript
// This tests that code CONTAINS certain strings, not that it WORKS
expect(content).toContain('Invalid JSON in variant');
// Should instead test:
// 1. Parse template with bad JSON
// 2. Verify error message contains variant name, index, and config snippet
// 3. Verify NO experiment was created (API not called)
```

**Effort:** 4 hours
**Priority:** HIGH - Template parsing is core feature

---

#### 5. Config File Corruption Handling (Risk: 8/10)
**Location:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/config/config.ts`
**Current Coverage:** ~70% (missing corruption scenarios)

**Why Critical:**
- Corrupted YAML breaks ALL commands
- File locking issues on network filesystems
- Concurrent writes from multiple terminals

**Missing Tests:**
- Config file truncated mid-write (disk full during save)
- Config file with invalid YAML (nested object corruption)
- Config file with circular references
- Concurrent config modifications (two terminals running `abs auth login`)
- Config directory not writable
- Config file mode 000 (no permissions)
- Symlink loop in config path
- Config on read-only filesystem

**Example Failure Scenario:**
```typescript
// Terminal 1: abs auth login --profile dev
// Terminal 2: abs auth login --profile prod (runs simultaneously)
// Both call saveConfig() at same time
// Result: YAML corruption, neither profile saved correctly
// All future commands fail with "Invalid YAML syntax"
```

**Effort:** 6 hours
**Priority:** MEDIUM-HIGH

---

### Tier 2 - HIGH (Would cause user frustration/data loss)

#### 6. Error Message Quality (Risk: 7/10)
**Location:** Global error handling in `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/utils/api-helper.ts`

**Why Important:**
- Generic "API error" messages don't help users debug
- No distinction between client errors (400) and server errors (500)
- No retry guidance for transient failures

**Missing Tests:**
- 401 Unauthorized shows "Run: abs auth login"
- 403 Forbidden shows "Check API key permissions"
- 404 Not Found shows resource type and ID
- 429 Rate Limited shows "Retry in X seconds"
- 500 Server Error shows "API issue, check status page"
- Network timeout shows "Check network connection"
- ECONNREFUSED shows "API endpoint unreachable"

**Effort:** 3 hours
**Priority:** HIGH for UX

---

#### 7. Keyring Platform Compatibility (Risk: 7/10)
**Location:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/config/keyring.ts`
**Current Coverage:** 100% with mocks, 0% real integration

**Why Important:**
- macOS Keychain access requires user approval
- Linux gnome-keyring may not be available
- Windows Credential Manager has different error codes

**Missing Tests:**
- macOS: First keyring access prompts for permission
- macOS: Keychain locked (user not logged in)
- Linux: gnome-keyring not running (fallback to file?)
- Linux: DBus not available
- Windows: Credential Manager access denied
- All platforms: Keyring full (no space for new entry)

**Effort:** 8 hours (requires test environments)
**Priority:** MEDIUM (can document workarounds)

---

#### 8. Profile Switching Edge Cases (Risk: 6/10)
**Location:** Various commands using `--profile` flag

**Why Important:**
- Switching between dev/staging/prod is common workflow
- Profile isolation bugs could modify wrong environment

**Missing Tests:**
- Command with --profile uses correct API key from keyring
- Command with --profile falls back to config endpoint
- Command with invalid --profile shows helpful error
- Default profile deletion switches to another profile
- Profile switching doesn't leak data between profiles
- Multiple commands with different profiles run concurrently

**Effort:** 4 hours
**Priority:** MEDIUM

---

#### 9. Doctor Command Diagnostic Accuracy (Risk: 6/10)
**Location:** `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/doctor/index.ts`
**Current Coverage:** 0%

**Why Important:**
- Users rely on `abs doctor` to debug issues
- False positives/negatives erode trust

**Missing Tests:**
- Detects missing config file
- Detects missing API key in keyring
- Detects invalid API endpoint
- Detects network connectivity issues
- Shows actionable error messages
- Exit code 1 on failure, 0 on success
- All checks run even if earlier ones fail

**Effort:** 3 hours
**Priority:** MEDIUM

---

### Tier 3 - MEDIUM (Nice to have, prevent edge case bugs)

#### 10. List Command Pagination (Risk: 5/10)
**Location:** Various list commands with --limit, --offset, --page

**Why Important:**
- Pagination bugs cause data loss (missing results)
- Off-by-one errors in pagination logic

**Missing Tests:**
- List with limit=0 (should show all or show none?)
- List with offset > total (should show empty or error?)
- List with negative limit (should error)
- List with negative offset (should error)
- List with page and offset together (which wins?)
- List large result set (>1000 items) doesn't timeout

**Effort:** 2 hours per resource = 20 hours total
**Priority:** LOW-MEDIUM

---

## Test Implementation Recommendations

### Top 10 Most Critical Missing Tests (Must Have Before 1.0)

#### 1. Auth Login Flow (Criticality: 10/10)
**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/auth/auth.test.ts` (NEW)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { authCommand } from './index.js';
import * as keyring from '../../lib/config/keyring.js';
import * as config from '../../lib/config/config.js';

describe('auth login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject invalid API key before saving to keyring', async () => {
    // Mock API to return 401 Unauthorized
    const setAPIKeySpy = vi.spyOn(keyring, 'setAPIKey');

    const program = new Command();
    program.addCommand(authCommand);

    await expect(
      program.parseAsync(['node', 'test', 'auth', 'login',
        '--api-key', 'INVALID',
        '--endpoint', 'https://api.absmartly.com/v1'
      ])
    ).rejects.toThrow(/authentication failed|invalid api key/i);

    // CRITICAL: Verify bad key was NOT saved
    expect(setAPIKeySpy).not.toHaveBeenCalled();
  });

  it('should save config and keyring atomically on success', async () => {
    const setAPIKeySpy = vi.spyOn(keyring, 'setAPIKey').mockResolvedValue();
    const setProfileSpy = vi.spyOn(config, 'setProfile');

    const program = new Command();
    program.addCommand(authCommand);

    await program.parseAsync(['node', 'test', 'auth', 'login',
      '--api-key', 'valid-key-123',
      '--endpoint', 'https://api.absmartly.com/v1'
    ]);

    expect(setAPIKeySpy).toHaveBeenCalledWith('valid-key-123', 'default');
    expect(setProfileSpy).toHaveBeenCalledWith('default', expect.objectContaining({
      api: { endpoint: 'https://api.absmartly.com/v1' }
    }));
  });

  it('should rollback keyring if config save fails', async () => {
    const setAPIKeySpy = vi.spyOn(keyring, 'setAPIKey').mockResolvedValue();
    const deleteAPIKeySpy = vi.spyOn(keyring, 'deleteAPIKey').mockResolvedValue(true);
    const setProfileSpy = vi.spyOn(config, 'setProfile').mockImplementation(() => {
      throw new Error('ENOSPC: Disk full');
    });

    const program = new Command();
    program.addCommand(authCommand);

    await expect(
      program.parseAsync(['node', 'test', 'auth', 'login',
        '--api-key', 'valid-key',
        '--endpoint', 'https://api.absmartly.com/v1'
      ])
    ).rejects.toThrow(/disk full/i);

    // CRITICAL: Verify rollback happened
    expect(deleteAPIKeySpy).toHaveBeenCalledWith('default');
  });

  it('should handle network timeout during login', async () => {
    // Mock API to timeout
    const setAPIKeySpy = vi.spyOn(keyring, 'setAPIKey');

    const program = new Command();
    program.addCommand(authCommand);

    await expect(
      program.parseAsync(['node', 'test', 'auth', 'login',
        '--api-key', 'key',
        '--endpoint', 'https://timeout.example.com/v1'
      ])
    ).rejects.toThrow(/timeout|network/i);

    expect(setAPIKeySpy).not.toHaveBeenCalled();
  });
});
```

**Estimated Effort:** 4 hours
**Prevents:** Corrupted credentials, locked-out users, security issues

---

#### 2. Setup Wizard Atomicity (Criticality: 9/10)
**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/setup/setup.test.ts` (NEW)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { setupCommand } from './index.js';
import * as readline from 'readline/promises';
import * as keyring from '../../lib/config/keyring.js';
import * as config from '../../lib/config/config.js';

describe('setup wizard', () => {
  it('should not save API key if user cancels at application selection', async () => {
    const mockRl = {
      question: vi.fn()
        .mockResolvedValueOnce('valid-api-key')  // API key
        .mockResolvedValueOnce('')  // Endpoint (use default)
        .mockResolvedValueOnce(''),  // App selection (cancel)
      close: vi.fn()
    };

    vi.spyOn(readline, 'createInterface').mockReturnValue(mockRl as any);
    const setAPIKeySpy = vi.spyOn(keyring, 'setAPIKey').mockResolvedValue();
    const setProfileSpy = vi.spyOn(config, 'setProfile');

    // Mock successful API connection
    // ... mock listApplications to return apps

    // Simulate user pressing Ctrl+C during app selection
    mockRl.question.mockRejectedValueOnce(new Error('User cancelled'));

    await expect(setupCommand.parseAsync(['node', 'test', 'setup']))
      .rejects.toThrow();

    // CRITICAL: Verify nothing was saved
    expect(setAPIKeySpy).not.toHaveBeenCalled();
    expect(setProfileSpy).not.toHaveBeenCalled();
  });

  it('should rollback keyring if config save fails', async () => {
    // Similar to auth login rollback test
    // ... setup mocks for readline input

    const setAPIKeySpy = vi.spyOn(keyring, 'setAPIKey').mockResolvedValue();
    const deleteAPIKeySpy = vi.spyOn(keyring, 'deleteAPIKey').mockResolvedValue(true);
    const setProfileSpy = vi.spyOn(config, 'setProfile').mockImplementation(() => {
      throw new Error('EACCES: Permission denied');
    });

    await expect(setupCommand.parseAsync(['node', 'test', 'setup']))
      .rejects.toThrow(/permission denied/i);

    expect(deleteAPIKeySpy).toHaveBeenCalledWith('default');
  });

  it('should handle empty API key input', async () => {
    const mockRl = {
      question: vi.fn().mockResolvedValueOnce(''),  // Empty API key
      close: vi.fn()
    };

    vi.spyOn(readline, 'createInterface').mockReturnValue(mockRl as any);

    await expect(setupCommand.parseAsync(['node', 'test', 'setup']))
      .rejects.toThrow(/api key is required/i);
  });
});
```

**Estimated Effort:** 6 hours
**Prevents:** Partial setup state, confused first-time users

---

#### 3. Experiment Delete (Criticality: 9/10)
**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/experiments/delete.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { deleteCommand } from './delete.js';
import { createAPIClient } from '../../lib/api/client.js';
import { server } from '../../test/mocks/server.js';
import { http, HttpResponse } from 'msw';

describe('experiments delete', () => {
  it('should require confirmation for production environment', async () => {
    // This test would fail because current code has NO confirmation!

    const client = createAPIClient('https://api.absmartly.com/v1', 'test-key');

    // Mock stdin to simulate user typing 'no'
    // ... setup stdin mock

    await expect(client.deleteExperiment(12345))
      .rejects.toThrow(/cancelled by user/i);
  });

  it('should show clear error when experiment not found', async () => {
    server.use(
      http.delete('https://api.absmartly.com/v1/experiments/:id', () => {
        return HttpResponse.json(
          { error: 'Not found' },
          { status: 404 }
        );
      })
    );

    const client = createAPIClient('https://api.absmartly.com/v1', 'test-key');

    await expect(client.deleteExperiment(99999))
      .rejects.toThrow(/experiment 99999 not found/i);
  });

  it('should show helpful error on permission denied', async () => {
    server.use(
      http.delete('https://api.absmartly.com/v1/experiments/:id', () => {
        return HttpResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      })
    );

    const client = createAPIClient('https://api.absmartly.com/v1', 'test-key');

    await expect(client.deleteExperiment(12345))
      .rejects.toThrow(/permission denied.*check api key permissions/i);
  });

  it('should handle network timeout gracefully', async () => {
    server.use(
      http.delete('https://api.absmartly.com/v1/experiments/:id', async () => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // Exceed timeout
        return HttpResponse.json({});
      })
    );

    const client = createAPIClient('https://api.absmartly.com/v1', 'test-key');

    await expect(client.deleteExperiment(12345))
      .rejects.toThrow(/timeout|network/i);
  });

  it('should validate experiment ID format', async () => {
    // Current code validates with branded types, test that
    await expect(deleteCommand.parseAsync(['node', 'test', 'delete', 'invalid']))
      .rejects.toThrow(/invalid experiment id/i);

    await expect(deleteCommand.parseAsync(['node', 'test', 'delete', '-1']))
      .rejects.toThrow(/must be positive/i);
  });
});
```

**Estimated Effort:** 2 hours
**Prevents:** Accidental deletion of production experiments

---

#### 4. Template Create with Invalid JSON (Criticality: 8/10)
**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/experiments/create.integration.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { createCommand } from './create.js';

describe('experiments create --from-file', () => {
  const testFile = join(process.cwd(), 'test-template-invalid.md');

  afterEach(() => {
    if (require('fs').existsSync(testFile)) {
      unlinkSync(testFile);
    }
  });

  it('should show helpful error with variant name and line number for invalid JSON', async () => {
    const template = `
## Variants

### variant_0
name: control
config: {"valid": "json"}

### variant_1
name: treatment
config: {"invalid": json}  // Missing quotes
    `.trim();

    writeFileSync(testFile, template, 'utf8');

    await expect(
      createCommand.parseAsync(['node', 'test', 'create', '--from-file', testFile])
    ).rejects.toThrow(/invalid json in variant "treatment" \(variant 1\)/i);
  });

  it('should show truncated config in error message for very long JSON', async () => {
    const longConfig = '{"key": "' + 'x'.repeat(200) + '"}';
    const template = `
## Variants

### variant_0
name: control
config: ${longConfig.slice(0, -1)}  // Missing closing brace
    `.trim();

    writeFileSync(testFile, template, 'utf8');

    await expect(
      createCommand.parseAsync(['node', 'test', 'create', '--from-file', testFile])
    ).rejects.toThrow(/config:.*\.\.\./i);  // Verify truncation with ...
  });

  it('should NOT create experiment if any variant has invalid JSON', async () => {
    const template = `
## Variants

### variant_0
name: control
config: {"valid": "json"}

### variant_1
name: treatment
config: invalid
    `.trim();

    writeFileSync(testFile, template, 'utf8');

    // Track API calls
    const createSpy = vi.spyOn(client, 'createExperiment');

    await expect(
      createCommand.parseAsync(['node', 'test', 'create', '--from-file', testFile])
    ).rejects.toThrow();

    // CRITICAL: Verify API was never called
    expect(createSpy).not.toHaveBeenCalled();
  });
});
```

**Estimated Effort:** 4 hours
**Prevents:** Lost work from confusing error messages

---

#### 5. Config Concurrent Write Protection (Criticality: 8/10)
**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/config/config.concurrent.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { saveConfig, loadConfig, setProfile } from './config.js';
import { unlinkSync, existsSync } from 'fs';

describe('config concurrent writes', () => {
  afterEach(() => {
    const path = getConfigPath();
    if (existsSync(path)) {
      unlinkSync(path);
    }
  });

  it('should handle concurrent profile saves without corruption', async () => {
    // Simulate two terminals running auth login simultaneously
    const profile1 = {
      api: { endpoint: 'https://dev.example.com/v1' },
      expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
    };

    const profile2 = {
      api: { endpoint: 'https://prod.example.com/v1' },
      expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
    };

    // Run concurrently
    await Promise.all([
      setProfile('dev', profile1),
      setProfile('prod', profile2),
    ]);

    // Verify both profiles were saved
    const config = loadConfig();
    expect(config.profiles.dev).toEqual(profile1);
    expect(config.profiles.prod).toEqual(profile2);

    // Verify YAML is valid (not corrupted)
    expect(() => loadConfig()).not.toThrow();
  });

  it('should handle disk full during config save', async () => {
    // Mock writeFileSync to throw ENOSPC on first call, succeed on retry
    let callCount = 0;
    vi.spyOn(fs, 'writeFileSync').mockImplementation((path, data, options) => {
      callCount++;
      if (callCount === 1) {
        const error: any = new Error('ENOSPC: no space left on device');
        error.code = 'ENOSPC';
        throw error;
      }
      // Succeed on retry
      return fs.writeFileSync(path, data, options);
    });

    await expect(
      setProfile('test', {
        api: { endpoint: 'https://example.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      })
    ).rejects.toThrow(/disk full.*free up disk space/i);
  });
});
```

**Estimated Effort:** 6 hours (requires threading/concurrency setup)
**Prevents:** Config file corruption, YAML syntax errors

---

#### 6. API Client Error Mapping (Criticality: 7/10)
**File:** `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/api/client-errors.integration.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { createAPIClient } from './client.js';
import { server } from '../test/mocks/server.js';
import { http, HttpResponse } from 'msw';

describe('API error handling', () => {
  it('should map 401 to authentication error with login instructions', async () => {
    server.use(
      http.get('https://api.absmartly.com/v1/experiments', () => {
        return HttpResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      })
    );

    const client = createAPIClient('https://api.absmartly.com/v1', 'invalid-key');

    await expect(client.listExperiments())
      .rejects.toThrow(/authentication failed.*abs auth login/i);
  });

  it('should map 403 to permission error with helpful message', async () => {
    server.use(
      http.delete('https://api.absmartly.com/v1/experiments/123', () => {
        return HttpResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      })
    );

    const client = createAPIClient('https://api.absmartly.com/v1', 'readonly-key');

    await expect(client.deleteExperiment(123))
      .rejects.toThrow(/permission denied.*check api key permissions/i);
  });

  it('should map 429 to rate limit error with retry guidance', async () => {
    server.use(
      http.get('https://api.absmartly.com/v1/experiments', () => {
        return HttpResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: { 'Retry-After': '60' }
          }
        );
      })
    );

    const client = createAPIClient('https://api.absmartly.com/v1', 'test-key');

    await expect(client.listExperiments())
      .rejects.toThrow(/rate limited.*retry in 60 seconds/i);
  });

  it('should map network errors to connection error', async () => {
    const client = createAPIClient('https://nonexistent.example.com/v1', 'test-key');

    await expect(client.listExperiments())
      .rejects.toThrow(/connection failed.*check network|endpoint/i);
  });

  it('should retry 500 errors up to 3 times', async () => {
    let attempts = 0;
    server.use(
      http.get('https://api.absmartly.com/v1/experiments', () => {
        attempts++;
        if (attempts <= 3) {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        }
        return HttpResponse.json({ experiments: [] });
      })
    );

    const client = createAPIClient('https://api.absmartly.com/v1', 'test-key');

    const result = await client.listExperiments();
    expect(attempts).toBe(4); // 1 initial + 3 retries
    expect(result).toEqual({ experiments: [] });
  });
});
```

**Estimated Effort:** 3 hours
**Prevents:** Confused users, poor debugging experience

---

#### 7-10: Lower Priority Tests

**7. Profile Switching Integration** (4 hours)
**8. Doctor Command Diagnostics** (3 hours)
**9. Keyring Platform Compatibility** (8 hours)
**10. Pagination Edge Cases** (2 hours per resource)

---

## Risk Assessment If Left Untested

### Scenario 1: User Deletes Wrong Experiment
**Likelihood:** MEDIUM (human error common)
**Impact:** HIGH (data loss, production impact)

**Current State:**
- No confirmation prompt
- Generic error messages
- No "undo" capability

**Without Tests:**
- Won't catch missing confirmation logic
- Won't validate error message clarity
- Won't ensure experiment ID validation

---

### Scenario 2: Auth Login Saves Bad Credentials
**Likelihood:** HIGH (network issues common)
**Impact:** CRITICAL (user locked out)

**Current State:**
- Saves to keyring before validating API key
- No rollback on connection test failure

**Without Tests:**
- Bug would go unnoticed until production
- Support team would get complaints
- Workaround requires manual keyring cleanup

---

### Scenario 3: Concurrent Config Corruption
**Likelihood:** LOW-MEDIUM (multi-terminal workflows)
**Impact:** HIGH (all commands break)

**Current State:**
- No file locking
- No atomic writes
- No corruption detection

**Without Tests:**
- Race condition bugs are hard to debug
- Manifests as "random" YAML errors
- Users blame the tool, not their workflow

---

## Recommended Testing Strategy

### Phase 1: Pre-1.0 Release (Must Have)
**Timeline:** 2-3 weeks
**Effort:** ~40 hours

1. Auth commands integration tests (4h)
2. Setup wizard integration tests (6h)
3. Experiment CRUD command tests (8h)
4. Template parsing integration tests (4h)
5. Config concurrent write tests (6h)
6. API error mapping tests (3h)
7. Profile switching tests (4h)
8. Doctor command tests (3h)

**Coverage Target:** 50% command integration coverage

---

### Phase 2: Post-1.0 Hardening
**Timeline:** 1-2 months
**Effort:** ~80 hours

9. All resource CRUD commands (segments, goals, metrics, etc.) - 40h
10. Keyring platform compatibility - 8h
11. Pagination edge cases - 20h
12. Cross-platform CI (GitHub Actions) - 8h
13. Load testing (large result sets) - 4h

**Coverage Target:** 80% command integration coverage

---

### Phase 3: Production Monitoring
**Timeline:** Ongoing

14. Error telemetry to track real-world failures
15. User feedback loop for error message quality
16. Automated canary tests against production API

---

## Test Infrastructure Improvements Needed

### 1. Integration Test Helpers
Create `/Users/joalves/git_tree/absmartly-cli-ts/src/test/helpers/command-runner.ts`:

```typescript
import { Command } from 'commander';
import { spawn } from 'child_process';

export async function runCommand(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  // Helper to run CLI commands in isolation
  // Captures stdout/stderr for assertions
  // Cleans up config/keyring after each test
}

export async function withCleanConfig<T>(fn: () => Promise<T>): Promise<T> {
  // Ensures each test has clean config state
  // Restores original config after test
}

export async function withMockKeyring<T>(fn: () => Promise<T>): Promise<T> {
  // Uses in-memory keyring instead of system keyring
  // Prevents polluting user's actual keyring during tests
}
```

### 2. MSW Mock Scenarios
Extend `/Users/joalves/git_tree/absmartly-cli-ts/src/test/mocks/`:

```typescript
// scenarios/auth-errors.ts
export const authErrorScenarios = {
  invalidApiKey: http.get('/experiments', () =>
    HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ),
  rateLimited: http.get('/experiments', () =>
    HttpResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60' }
    })
  ),
  networkTimeout: http.get('/experiments', async () => {
    await delay(35000); // Exceed timeout
    return HttpResponse.json({});
  }),
};
```

### 3. Snapshot Testing for Error Messages
```typescript
it('should show helpful error for missing API key', async () => {
  await expect(
    runCommand(['experiments', 'list'])
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    "No API key found for profile "default".
    Run: abs auth login --api-key YOUR_KEY --endpoint https://api.absmartly.com/v1
    Or: abs setup  # for interactive configuration"
  `);
});
```

---

## Conclusion

This CLI has **excellent foundational test coverage** (config, keyring, branded types, template parsing) but **CRITICAL gaps** in integration testing that **will cause production incidents**.

**The 3 highest-risk areas:**
1. **Auth commands** - Could lock users out or save bad credentials
2. **Setup wizard** - Could leave partial state, confuse first-time users
3. **Data-modifying commands** - Could silently fail or corrupt data

**Recommended Priority:**
- **Before 1.0 release:** Implement tests 1-8 (~40 hours)
- **Post 1.0:** Implement tests 9-13 (~80 hours)
- **Ongoing:** Production monitoring and telemetry

**Current test quality is GOOD for unit tests, POOR for integration tests.**
Without integration tests, expect:
- User complaints about confusing errors
- Support burden from corrupted config/keyring
- Data loss from failed CRUD operations
- Reputational damage from buggy first impressions

**This is fixable with focused effort on the Top 10 tests listed above.**
