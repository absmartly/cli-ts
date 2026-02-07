# Test Coverage Summary - ABSmartly CLI TypeScript

**Status:** 385 tests, 22 test files, 85% unit coverage, 7.5% integration coverage

## Quick Stats

- **Unit Tests:** EXCELLENT (config, keyring, API client, parsing, types)
- **Integration Tests:** POOR (3 of 40 commands tested)
- **Critical Risk:** HIGH (production incidents likely)

## Top 10 Critical Missing Tests

### Tier 1 - CRITICAL (Must Have Before 1.0)

| # | Test | Risk | Effort | Impact If Missing |
|---|------|------|--------|-------------------|
| 1 | Auth login flow | 10/10 | 4h | Users locked out, corrupted credentials |
| 2 | Setup wizard atomicity | 9/10 | 6h | Partial state, confused users |
| 3 | Experiment delete | 9/10 | 2h | Accidental data deletion |
| 4 | Template create invalid JSON | 8/10 | 4h | Lost work, poor UX |
| 5 | Config concurrent writes | 8/10 | 6h | YAML corruption |

**Subtotal: 22 hours**

### Tier 2 - HIGH (Should Have)

| # | Test | Risk | Effort | Impact If Missing |
|---|------|------|--------|-------------------|
| 6 | API error mapping | 7/10 | 3h | Poor error messages, confused users |
| 7 | Keyring platform compat | 7/10 | 8h | Fails on Linux/Windows |
| 8 | Profile switching | 6/10 | 4h | Data leakage between profiles |
| 9 | Doctor diagnostics | 6/10 | 3h | False diagnostics, low trust |
| 10 | List pagination | 5/10 | 2h | Missing/duplicate results |

**Subtotal: 20 hours**

**Total for Top 10: 42 hours (1 week sprint)**

## Critical Gaps by Category

### 1. Command Integration Tests
- **Current:** 3 of 40 commands tested (7.5%)
- **Missing:** Auth, setup, 95% of CRUD operations
- **Risk:** Silent failures, data corruption

### 2. Error Handling
- **Current:** Unit tests for error types
- **Missing:** E2E error flow tests
- **Risk:** Generic/unhelpful error messages

### 3. State Management
- **Current:** Individual config/keyring tests
- **Missing:** Atomicity, rollback, concurrency
- **Risk:** Corrupted state, locked-out users

### 4. Platform Compatibility
- **Current:** Mocked keyring tests only
- **Missing:** Real keyring on macOS/Linux/Windows
- **Risk:** Fails in production on different platforms

## Example Critical Bugs Untested

### Bug 1: Auth Saves Invalid Credentials
```typescript
// Current code in auth/index.ts:
await setAPIKey(options.apiKey, profileName);  // ❌ Saves BEFORE validation
setProfile(profileName, profile);
// If validation fails later, user has bad key in keyring
```

**Without test:** Ships to production, users locked out

### Bug 2: Setup Wizard Partial State
```typescript
// Current code in setup/index.ts:
await setAPIKey(apiKey, 'default');  // ✅ Saved
setProfile('default', profile);      // ❌ Throws disk full
// Result: API key in keyring, no config file
```

**Without test:** Corrupted setup state, confused users

### Bug 3: Experiment Delete No Confirmation
```typescript
// Current code in experiments/delete.ts:
await client.deleteExperiment(id);  // ❌ No confirmation!
console.log(chalk.green(`✓ Experiment ${id} deleted`));
```

**Without test:** Accidental deletion in production

## Recommended Action Plan

### Week 1: Auth & Setup (Must Have)
- [ ] Auth login integration tests (4h)
- [ ] Setup wizard integration tests (6h)
- [ ] Auth logout/status tests (2h)

**Deliverable:** Auth flow works reliably

### Week 2: CRUD Commands (Must Have)
- [ ] Experiment CRUD tests (8h)
- [ ] Template parsing integration (4h)
- [ ] Segment CRUD tests (4h)

**Deliverable:** Data-modifying commands safe

### Week 3: Reliability (Should Have)
- [ ] Config concurrent writes (6h)
- [ ] API error mapping (3h)
- [ ] Profile switching (4h)
- [ ] Doctor diagnostics (3h)

**Deliverable:** Robust error handling

### Week 4+: Coverage Expansion
- [ ] All resource CRUD (40h)
- [ ] Keyring platform tests (8h)
- [ ] Pagination edge cases (20h)

**Deliverable:** 80% integration coverage

## Success Metrics

### Current State
- Unit coverage: 85%
- Integration coverage: 7.5%
- Known critical bugs: 0 (but untested!)
- User complaints: 0 (pre-release)

### Target State (Post Week 3)
- Unit coverage: 85% (maintained)
- Integration coverage: 50%
- Known critical bugs: 0 (tested!)
- Confidence level: HIGH

## Files to Create

### Must Create Before 1.0
1. `/src/commands/auth/auth.test.ts` - Auth flow integration tests
2. `/src/commands/setup/setup.test.ts` - Setup wizard tests
3. `/src/commands/experiments/delete.test.ts` - Delete with confirmation
4. `/src/commands/experiments/create.integration.test.ts` - Template edge cases
5. `/src/lib/config/config.concurrent.test.ts` - Concurrency tests
6. `/src/lib/api/client-errors.integration.test.ts` - Error mapping
7. `/src/test/helpers/command-runner.ts` - Test infrastructure

### Nice to Have
8. `/src/commands/doctor/doctor.test.ts` - Diagnostic tests
9. Platform-specific keyring tests (CI pipeline)
10. Load tests for large result sets

## Key Takeaways

1. **Unit test quality is EXCELLENT** - Config, keyring, parsing, types well-covered
2. **Integration test coverage is POOR** - Only 3 of 40 commands tested
3. **Biggest risk is auth/setup flows** - Could lock users out or corrupt state
4. **Data-modifying commands are untested** - Silent failures possible
5. **Fix is achievable** - 42 hours for top 10 critical tests

## Recommendation

**BLOCK 1.0 release until Top 5 tests implemented (22 hours).**

These 5 tests prevent:
- Locked-out users (auth)
- Corrupted setup state (setup wizard)
- Accidental data deletion (delete commands)
- Lost work from bad error messages (template parsing)
- YAML corruption (concurrent writes)

**Post-1.0:** Implement tests 6-10 (20 hours) for production hardening.

---

**Bottom Line:** Great foundation, critical gaps in integration testing. Fixable in 1 sprint.
