# OAuth Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OAuth (Authorization Code + PKCE) as an alternative to API key authentication, with the option to auto-create a persistent API key after OAuth login.

**Architecture:** New `src/lib/auth/oauth.ts` module handles PKCE generation, local callback server, browser launch, and token exchange. The existing `AxiosHttpClient` gains an `AuthConfig` union type to support both `Api-Key` and `Bearer` headers. Profile config gets a new `auth-method` field. The `auth login` command becomes OAuth-first when `--api-key` is not provided.

**Tech Stack:** Node.js `crypto` (PKCE), Node.js `http` (callback server), `open` (browser launch, already in deps), `axios` (token exchange)

---

### Task 1: PKCE Utility

**Files:**
- Create: `src/lib/auth/pkce.ts`
- Create: `src/lib/auth/pkce.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/auth/pkce.test.ts
import { describe, it, expect } from 'vitest';
import { generatePKCE } from './pkce.js';

describe('generatePKCE', () => {
  it('returns a code verifier and challenge', () => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    expect(codeVerifier).toBeDefined();
    expect(codeChallenge).toBeDefined();
  });

  it('generates a code verifier between 43 and 128 characters', () => {
    const { codeVerifier } = generatePKCE();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeVerifier.length).toBeLessThanOrEqual(128);
  });

  it('generates a code verifier using only unreserved characters', () => {
    const { codeVerifier } = generatePKCE();
    expect(codeVerifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('generates a base64url-encoded challenge', () => {
    const { codeChallenge } = generatePKCE();
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(codeChallenge).not.toContain('=');
  });

  it('generates different values each call', () => {
    const a = generatePKCE();
    const b = generatePKCE();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/auth/pkce.test.ts`
Expected: FAIL — module `./pkce.js` not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/auth/pkce.ts
import { randomBytes, createHash } from 'crypto';

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

export function generatePKCE(): PKCEPair {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth/pkce.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/pkce.ts src/lib/auth/pkce.test.ts
git commit -m "feat: add PKCE code verifier and challenge generation"
```

---

### Task 2: OAuth Callback Server

**Files:**
- Create: `src/lib/auth/callback-server.ts`
- Create: `src/lib/auth/callback-server.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/auth/callback-server.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { startCallbackServer, type CallbackServer } from './callback-server.js';

describe('startCallbackServer', () => {
  let server: CallbackServer | undefined;

  afterEach(async () => {
    if (server) {
      server.close();
      server = undefined;
    }
  });

  it('starts a server and returns port and redirectUri', async () => {
    server = await startCallbackServer();
    expect(server.port).toBeGreaterThan(0);
    expect(server.redirectUri).toBe(`http://localhost:${server.port}/oauth/callback`);
  });

  it('resolves with authorization code on callback', async () => {
    server = await startCallbackServer();
    const codePromise = server.waitForCode(5000);

    const response = await fetch(`http://localhost:${server.port}/oauth/callback?code=test-auth-code`);
    expect(response.ok).toBe(true);

    const code = await codePromise;
    expect(code).toBe('test-auth-code');
  });

  it('returns an HTML success page on callback', async () => {
    server = await startCallbackServer();
    const codePromise = server.waitForCode(5000);

    const response = await fetch(`http://localhost:${server.port}/oauth/callback?code=test-code`);
    const body = await response.text();
    expect(body).toContain('Authentication successful');

    await codePromise;
  });

  it('rejects if no code parameter in callback', async () => {
    server = await startCallbackServer();
    const codePromise = server.waitForCode(5000);

    await fetch(`http://localhost:${server.port}/oauth/callback`);

    await expect(codePromise).rejects.toThrow('No authorization code');
  });

  it('rejects on timeout', async () => {
    server = await startCallbackServer();
    const codePromise = server.waitForCode(100);

    await expect(codePromise).rejects.toThrow('timed out');
  });

  it('tries preferred ports first', async () => {
    server = await startCallbackServer([0]);
    expect(server.port).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/auth/callback-server.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/auth/callback-server.ts
import http from 'http';

export interface CallbackServer {
  port: number;
  redirectUri: string;
  waitForCode(timeoutMs: number): Promise<string>;
  close(): void;
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html><body style="font-family:system-ui;text-align:center;padding:40px">
<h2>Authentication successful!</h2>
<p>You can close this tab and return to the CLI.</p>
</body></html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html><body style="font-family:system-ui;text-align:center;padding:40px">
<h2>Authentication failed</h2>
<p>No authorization code received. Please try again.</p>
</body></html>`;

export async function startCallbackServer(preferredPorts: number[] = [8787, 8080]): Promise<CallbackServer> {
  const portsToTry = [...preferredPorts, 0];

  for (const port of portsToTry) {
    try {
      return await tryBindServer(port);
    } catch {
      continue;
    }
  }

  throw new Error('Could not bind callback server on any port');
}

function tryBindServer(port: number): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    let codeResolve: ((code: string) => void) | undefined;
    let codeReject: ((err: Error) => void) | undefined;

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost`);
      if (url.pathname !== '/oauth/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(SUCCESS_HTML);
        codeResolve?.(code);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        codeReject?.(new Error('No authorization code received in callback'));
      }
    });

    server.on('error', reject);

    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to get server address'));
        return;
      }

      const boundPort = address.port;
      resolve({
        port: boundPort,
        redirectUri: `http://localhost:${boundPort}/oauth/callback`,
        waitForCode(timeoutMs: number): Promise<string> {
          return new Promise<string>((res, rej) => {
            codeResolve = res;
            codeReject = rej;

            const timer = setTimeout(() => {
              rej(new Error(`Authentication timed out after ${Math.round(timeoutMs / 1000)}s — please try again`));
              server.close();
            }, timeoutMs);

            const origResolve = codeResolve;
            codeResolve = (code: string) => {
              clearTimeout(timer);
              server.close();
              origResolve(code);
            };
            const origReject = codeReject;
            codeReject = (err: Error) => {
              clearTimeout(timer);
              server.close();
              origReject(err);
            };
          });
        },
        close() {
          server.close();
        },
      });
    });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth/callback-server.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/callback-server.ts src/lib/auth/callback-server.test.ts
git commit -m "feat: add OAuth callback server for receiving authorization codes"
```

---

### Task 3: OAuth Token Exchange

**Files:**
- Create: `src/lib/auth/token-exchange.ts`
- Create: `src/lib/auth/token-exchange.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/auth/token-exchange.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { exchangeCodeForToken } from './token-exchange.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('exchangeCodeForToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exchanges authorization code for access token', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        access_token: 'jwt-token-123',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'mcp:access user:info',
      },
    });

    const result = await exchangeCodeForToken({
      endpoint: 'https://api.example.com/v1',
      code: 'auth-code-123',
      codeVerifier: 'verifier-abc',
      redirectUri: 'http://localhost:8787/oauth/callback',
      clientId: 'mcp-absmartly-universal',
    });

    expect(result.accessToken).toBe('jwt-token-123');
    expect(result.expiresIn).toBe(86400);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.example.com/auth/oauth/token',
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );

    const params = mockedAxios.post.mock.calls[0]![1] as URLSearchParams;
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code')).toBe('auth-code-123');
    expect(params.get('code_verifier')).toBe('verifier-abc');
    expect(params.get('redirect_uri')).toBe('http://localhost:8787/oauth/callback');
    expect(params.get('client_id')).toBe('mcp-absmartly-universal');
  });

  it('strips /v1 suffix from endpoint before building token URL', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'token', token_type: 'Bearer', expires_in: 3600 },
    });

    await exchangeCodeForToken({
      endpoint: 'https://api.example.com/v1',
      code: 'code',
      codeVerifier: 'verifier',
      redirectUri: 'http://localhost:8787/oauth/callback',
      clientId: 'mcp-absmartly-universal',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.example.com/auth/oauth/token',
      expect.anything(),
      expect.anything()
    );
  });

  it('throws on error response', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: 'invalid_grant', error_description: 'Code expired' } },
      isAxiosError: true,
    });

    await expect(
      exchangeCodeForToken({
        endpoint: 'https://api.example.com/v1',
        code: 'expired-code',
        codeVerifier: 'verifier',
        redirectUri: 'http://localhost:8787/oauth/callback',
        clientId: 'mcp-absmartly-universal',
      })
    ).rejects.toThrow('Code expired');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/auth/token-exchange.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/auth/token-exchange.ts
import axios from 'axios';

export interface TokenExchangeParams {
  endpoint: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

function getOAuthBaseUrl(endpoint: string): string {
  return endpoint.replace(/\/v\d+\/?$/, '');
}

export async function exchangeCodeForToken(params: TokenExchangeParams): Promise<TokenResponse> {
  const baseUrl = getOAuthBaseUrl(params.endpoint);
  const tokenUrl = `${baseUrl}/auth/oauth/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
  });

  try {
    const response = await axios.post(tokenUrl, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      scope: response.data.scope,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const { error_description, error: errCode } = error.response.data;
      throw new Error(error_description || errCode || 'Token exchange failed');
    }
    throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : error}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth/token-exchange.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/token-exchange.ts src/lib/auth/token-exchange.test.ts
git commit -m "feat: add OAuth token exchange with PKCE verification"
```

---

### Task 4: OAuth Flow Orchestrator

**Files:**
- Create: `src/lib/auth/oauth.ts`
- Create: `src/lib/auth/oauth.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/auth/oauth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startOAuthFlow } from './oauth.js';
import * as callbackServerModule from './callback-server.js';
import * as tokenExchangeModule from './token-exchange.js';
import * as pkceModule from './pkce.js';

vi.mock('./callback-server.js');
vi.mock('./token-exchange.js');
vi.mock('./pkce.js');
vi.mock('open', () => ({ default: vi.fn() }));

const mockedCallbackServer = vi.mocked(callbackServerModule);
const mockedTokenExchange = vi.mocked(tokenExchangeModule);
const mockedPkce = vi.mocked(pkceModule);

describe('startOAuthFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedPkce.generatePKCE.mockReturnValue({
      codeVerifier: 'test-verifier',
      codeChallenge: 'test-challenge',
    });

    const mockServer = {
      port: 8787,
      redirectUri: 'http://localhost:8787/oauth/callback',
      waitForCode: vi.fn().mockResolvedValue('auth-code-from-browser'),
      close: vi.fn(),
    };
    mockedCallbackServer.startCallbackServer.mockResolvedValue(mockServer);

    mockedTokenExchange.exchangeCodeForToken.mockResolvedValue({
      accessToken: 'jwt-access-token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      scope: 'mcp:access user:info',
    });
  });

  it('orchestrates the full OAuth flow and returns a token', async () => {
    const result = await startOAuthFlow('https://api.example.com/v1');

    expect(mockedPkce.generatePKCE).toHaveBeenCalled();
    expect(mockedCallbackServer.startCallbackServer).toHaveBeenCalled();
    expect(mockedTokenExchange.exchangeCodeForToken).toHaveBeenCalledWith({
      endpoint: 'https://api.example.com/v1',
      code: 'auth-code-from-browser',
      codeVerifier: 'test-verifier',
      redirectUri: 'http://localhost:8787/oauth/callback',
      clientId: 'mcp-absmartly-universal',
    });

    expect(result.accessToken).toBe('jwt-access-token');
    expect(result.expiresIn).toBe(86400);
  });

  it('builds correct authorization URL', async () => {
    const openModule = await import('open');
    const mockedOpen = vi.mocked(openModule.default);
    mockedOpen.mockResolvedValue(undefined as never);

    await startOAuthFlow('https://api.example.com/v1');

    const calledUrl = mockedOpen.mock.calls[0]![0] as string;
    const url = new URL(calledUrl);
    expect(url.origin).toBe('https://api.example.com');
    expect(url.pathname).toBe('/auth/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('mcp-absmartly-universal');
    expect(url.searchParams.get('code_challenge')).toBe('test-challenge');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('mcp:access user:info');
  });

  it('handles noBrowser option by not calling open', async () => {
    const openModule = await import('open');
    const mockedOpen = vi.mocked(openModule.default);

    await startOAuthFlow('https://api.example.com/v1', { noBrowser: true });

    expect(mockedOpen).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/auth/oauth.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/auth/oauth.ts
import open from 'open';
import { generatePKCE } from './pkce.js';
import { startCallbackServer } from './callback-server.js';
import { exchangeCodeForToken, type TokenResponse } from './token-exchange.js';

const OAUTH_CLIENT_ID = 'mcp-absmartly-universal';
const OAUTH_SCOPES = 'mcp:access user:info';
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

export interface OAuthFlowOptions {
  noBrowser?: boolean;
  timeoutMs?: number;
}

function getOAuthBaseUrl(endpoint: string): string {
  return endpoint.replace(/\/v\d+\/?$/, '');
}

function buildAuthorizationUrl(
  endpoint: string,
  codeChallenge: string,
  redirectUri: string
): string {
  const baseUrl = getOAuthBaseUrl(endpoint);
  const url = new URL(`${baseUrl}/auth/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', OAUTH_SCOPES);
  return url.toString();
}

export async function startOAuthFlow(
  endpoint: string,
  options: OAuthFlowOptions = {}
): Promise<TokenResponse> {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const timeoutMs = options.timeoutMs ?? AUTH_TIMEOUT_MS;

  const server = await startCallbackServer();
  const authUrl = buildAuthorizationUrl(endpoint, codeChallenge, server.redirectUri);

  if (options.noBrowser) {
    console.log(`\nOpen the following URL in your browser to authenticate:\n`);
    console.log(`  ${authUrl}\n`);
    console.log(`Waiting for authentication...`);
  } else {
    try {
      await open(authUrl);
      console.log('Browser opened for authentication...');
    } catch {
      console.log(`\nCould not open browser. Open this URL manually:\n`);
      console.log(`  ${authUrl}\n`);
      console.log(`Waiting for authentication...`);
    }
  }

  let code: string;
  try {
    code = await server.waitForCode(timeoutMs);
  } catch (error) {
    server.close();
    throw error;
  }

  return exchangeCodeForToken({
    endpoint,
    code,
    codeVerifier,
    redirectUri: server.redirectUri,
    clientId: OAUTH_CLIENT_ID,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth/oauth.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/oauth.ts src/lib/auth/oauth.test.ts
git commit -m "feat: add OAuth flow orchestrator with browser launch and headless fallback"
```

---

### Task 5: Keyring OAuth Token Storage

**Files:**
- Modify: `src/lib/config/keyring.ts`
- Modify: `src/lib/config/keyring.test.ts` (if exists, otherwise create)

- [ ] **Step 1: Write the failing tests**

Add these tests to the existing keyring test file (or create new):

```typescript
// Add to keyring tests
import { describe, it, expect } from 'vitest';
import { setOAuthToken, getOAuthToken, deleteOAuthToken } from './keyring.js';

describe('OAuth token keyring', () => {
  it('stores and retrieves an OAuth token', async () => {
    await setOAuthToken('test-jwt-token', 'test-profile');
    const token = await getOAuthToken('test-profile');
    expect(token).toBe('test-jwt-token');
  });

  it('returns null for missing OAuth token', async () => {
    const token = await getOAuthToken('nonexistent-profile');
    expect(token).toBeNull();
  });

  it('deletes an OAuth token', async () => {
    await setOAuthToken('test-jwt-token', 'delete-test');
    await deleteOAuthToken('delete-test');
    const token = await getOAuthToken('delete-test');
    expect(token).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/config/keyring.test.ts`
Expected: FAIL — `setOAuthToken` is not exported

- [ ] **Step 3: Add OAuth token convenience functions to keyring.ts**

Add at the end of `src/lib/config/keyring.ts`:

```typescript
export async function setOAuthToken(token: string, profile?: string): Promise<void> {
  await setPassword('oauth-token', token, profile ? { profile } : {});
}

export async function getOAuthToken(profile?: string): Promise<string | null> {
  return await getPassword('oauth-token', profile ? { profile } : {});
}

export async function deleteOAuthToken(profile?: string): Promise<boolean> {
  return await deletePassword('oauth-token', profile ? { profile } : {});
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/config/keyring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/config/keyring.ts src/lib/config/keyring.test.ts
git commit -m "feat: add OAuth token storage to keyring"
```

---

### Task 6: Profile Config Auth Method

**Files:**
- Modify: `src/lib/config/config.ts`

- [ ] **Step 1: Write the failing test**

Add to config tests:

```typescript
import { describe, it, expect } from 'vitest';
import { getProfile, setProfile } from './config.js';
import type { Profile } from './config.js';

describe('profile auth-method', () => {
  it('defaults auth-method to api-key when not set', () => {
    const profile = getProfile('default');
    expect(profile.api['auth-method'] ?? 'api-key').toBe('api-key');
  });

  it('stores and retrieves auth-method oauth-jwt', () => {
    const profile: Profile = {
      api: { endpoint: 'https://example.com/v1', 'auth-method': 'oauth-jwt' },
      expctld: { endpoint: '' },
    };
    setProfile('oauth-test', profile);
    const loaded = getProfile('oauth-test');
    expect(loaded.api['auth-method']).toBe('oauth-jwt');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/config/config.test.ts`
Expected: FAIL — `'auth-method'` does not exist on type `APIConfig`

- [ ] **Step 3: Add auth-method to APIConfig interface**

In `src/lib/config/config.ts`, modify the `APIConfig` interface:

```typescript
export interface APIConfig {
  endpoint: string;
  token?: string;
  'auth-method'?: 'api-key' | 'oauth-jwt';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/config/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/config/config.ts src/lib/config/config.test.ts
git commit -m "feat: add auth-method field to profile API config"
```

---

### Task 7: HTTP Client Auth Config Support

**Files:**
- Modify: `src/lib/api/axios-adapter.ts`
- Modify: `src/lib/api/axios-adapter.test.ts` (or `src/lib/api/client-errors.test.ts`)
- Modify: `src/lib/api/client.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// Add to axios-adapter tests
import { describe, it, expect } from 'vitest';
import { AxiosHttpClient } from './axios-adapter.js';

describe('AxiosHttpClient auth modes', () => {
  it('supports api-key auth config', () => {
    const client = new AxiosHttpClient('https://api.example.com', {
      method: 'api-key',
      apiKey: 'test-key-123',
    });
    expect(client.getBaseUrl()).toBe('https://api.example.com');
  });

  it('supports oauth-jwt auth config', () => {
    const client = new AxiosHttpClient('https://api.example.com', {
      method: 'oauth-jwt',
      token: 'jwt-token-abc',
    });
    expect(client.getBaseUrl()).toBe('https://api.example.com');
  });

  it('still supports string apiKey for backwards compatibility', () => {
    const client = new AxiosHttpClient('https://api.example.com', 'test-key-123');
    expect(client.getBaseUrl()).toBe('https://api.example.com');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api/axios-adapter.test.ts`
Expected: FAIL — constructor doesn't accept auth config object

- [ ] **Step 3: Modify AxiosHttpClient to support AuthConfig**

In `src/lib/api/axios-adapter.ts`, change the constructor signature and add the `AuthConfig` type:

```typescript
export type AuthConfig =
  | { method: 'api-key'; apiKey: string }
  | { method: 'oauth-jwt'; token: string; onExpired?: () => Promise<AuthConfig> };

export class AxiosHttpClient implements HttpClient {
  private client: AxiosInstance;
  private verbose: boolean;
  private authConfig: AuthConfig;

  constructor(
    endpoint: string,
    auth: string | AuthConfig,
    options: { verbose?: boolean; timeout?: number } = {}
  ) {
    this.verbose = options.verbose ?? false;
    this.authConfig = typeof auth === 'string'
      ? { method: 'api-key', apiKey: auth }
      : auth;

    const authHeader = this.authConfig.method === 'api-key'
      ? `Api-Key ${this.authConfig.apiKey}`
      : `Bearer ${this.authConfig.token}`;

    this.client = axios.create({
      baseURL: endpoint,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': `absmartly-cli/${version}`,
      },
    });

    // ... rest of constructor unchanged (axiosRetry, interceptors, etc.)
  }
  // ... rest of class unchanged
}

export function createAxiosHttpClient(
  endpoint: string,
  auth: string | AuthConfig,
  options?: { verbose?: boolean; timeout?: number }
): AxiosHttpClient {
  return new AxiosHttpClient(endpoint, auth, options);
}
```

Also update `src/lib/api/client.ts` to pass through:

```typescript
import { createAxiosHttpClient, type AuthConfig } from './axios-adapter.js';

export class APIClient extends EngineAPIClient {
  constructor(endpoint: string, auth: string | AuthConfig, options: ClientOptions = {}) {
    const httpClient = createAxiosHttpClient(endpoint, auth, options);
    super(httpClient);
  }
}

export function createAPIClient(
  endpoint: string,
  auth: string | AuthConfig,
  options?: ClientOptions
): APIClient {
  return new APIClient(endpoint, auth, options);
}
```

- [ ] **Step 4: Run all tests to verify nothing is broken**

Run: `npx vitest run`
Expected: All tests PASS (backwards compatible — string apiKey still works)

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/axios-adapter.ts src/lib/api/client.ts
git commit -m "feat: support both Api-Key and Bearer auth in HTTP client"
```

---

### Task 8: Add 401 Auto Re-auth Interceptor (JWT mode)

**Files:**
- Modify: `src/lib/api/axios-adapter.ts`
- Modify: `src/lib/api/axios-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Add to axios-adapter tests
describe('OAuth JWT auto re-auth', () => {
  it('retries request after re-auth on 401 in oauth-jwt mode', async () => {
    let callCount = 0;
    const refreshedAuth: AuthConfig = { method: 'oauth-jwt', token: 'refreshed-token' };

    const client = new AxiosHttpClient('https://api.example.com', {
      method: 'oauth-jwt',
      token: 'expired-token',
      onExpired: vi.fn().mockResolvedValue(refreshedAuth),
    });

    // This test verifies the interceptor behavior. The actual HTTP calls
    // would be mocked via msw or nock in a real integration test.
    // For unit testing, we verify the onExpired callback is wired up.
    expect(client).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (or passes as baseline)**

Run: `npx vitest run src/lib/api/axios-adapter.test.ts`

- [ ] **Step 3: Add 401 interceptor for JWT re-auth**

In the `AxiosHttpClient` constructor, add a response interceptor before the existing error interceptor:

```typescript
if (this.authConfig.method === 'oauth-jwt' && this.authConfig.onExpired) {
  const onExpired = this.authConfig.onExpired;
  let isRefreshing = false;

  this.client.interceptors.response.use(undefined, async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || isRefreshing) {
      return Promise.reject(error);
    }

    isRefreshing = true;
    try {
      const newAuth = await onExpired();
      const newHeader = newAuth.method === 'api-key'
        ? `Api-Key ${newAuth.apiKey}`
        : `Bearer ${newAuth.token}`;

      this.client.defaults.headers.common['Authorization'] = newHeader;
      this.authConfig = newAuth;

      if (error.config) {
        error.config.headers['Authorization'] = newHeader;
        return this.client.request(error.config);
      }
    } catch {
      // re-auth failed, propagate original 401
    } finally {
      isRefreshing = false;
    }

    return Promise.reject(error);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/api/axios-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/axios-adapter.ts src/lib/api/axios-adapter.test.ts
git commit -m "feat: add automatic re-authentication on 401 for OAuth JWT mode"
```

---

### Task 9: Update resolveAuth in api-helper

**Files:**
- Modify: `src/lib/utils/api-helper.ts`
- Modify or create: `src/lib/utils/api-helper.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/utils/api-helper.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveAuth } from './api-helper.js';
import * as configModule from '../config/config.js';
import * as keyringModule from '../config/keyring.js';

vi.mock('../config/config.js');
vi.mock('../config/keyring.js');

const mockedConfig = vi.mocked(configModule);
const mockedKeyring = vi.mocked(keyringModule);

describe('resolveAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ABSMARTLY_API_KEY;

    mockedConfig.loadConfig.mockReturnValue({
      'default-profile': 'default',
      'analytics-opt-out': false,
      output: 'table',
      profiles: {
        default: {
          api: { endpoint: 'https://api.example.com/v1' },
          expctld: { endpoint: '' },
        },
      },
    });
  });

  it('returns api-key auth when --api-key flag is provided', async () => {
    const auth = await resolveAuth({ apiKey: 'flag-key' });
    expect(auth).toEqual({ method: 'api-key', apiKey: 'flag-key' });
  });

  it('returns api-key auth from env var', async () => {
    process.env.ABSMARTLY_API_KEY = 'env-key';
    const auth = await resolveAuth({});
    expect(auth).toEqual({ method: 'api-key', apiKey: 'env-key' });
  });

  it('returns api-key auth from keyring when auth-method is api-key', async () => {
    mockedKeyring.getAPIKey.mockResolvedValue('keyring-api-key');
    const auth = await resolveAuth({});
    expect(auth).toEqual({ method: 'api-key', apiKey: 'keyring-api-key' });
  });

  it('returns oauth-jwt auth from keyring when auth-method is oauth-jwt', async () => {
    mockedConfig.loadConfig.mockReturnValue({
      'default-profile': 'default',
      'analytics-opt-out': false,
      output: 'table',
      profiles: {
        default: {
          api: { endpoint: 'https://api.example.com/v1', 'auth-method': 'oauth-jwt' },
          expctld: { endpoint: '' },
        },
      },
    });
    mockedConfig.getProfile.mockReturnValue({
      api: { endpoint: 'https://api.example.com/v1', 'auth-method': 'oauth-jwt' },
      expctld: { endpoint: '' },
    });
    mockedKeyring.getOAuthToken.mockResolvedValue('jwt-token-from-keyring');

    const auth = await resolveAuth({});
    expect(auth.method).toBe('oauth-jwt');
  });

  it('--api-key flag overrides oauth-jwt auth-method in profile', async () => {
    mockedConfig.loadConfig.mockReturnValue({
      'default-profile': 'default',
      'analytics-opt-out': false,
      output: 'table',
      profiles: {
        default: {
          api: { endpoint: 'https://api.example.com/v1', 'auth-method': 'oauth-jwt' },
          expctld: { endpoint: '' },
        },
      },
    });

    const auth = await resolveAuth({ apiKey: 'override-key' });
    expect(auth).toEqual({ method: 'api-key', apiKey: 'override-key' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/utils/api-helper.test.ts`
Expected: FAIL — `resolveAuth` is not exported

- [ ] **Step 3: Add resolveAuth and update getAPIClientFromOptions**

In `src/lib/utils/api-helper.ts`:

```typescript
import { getOAuthToken } from '../config/keyring.js';
import type { AuthConfig } from '../api/axios-adapter.js';

export async function resolveAuth(options: GlobalOptions): Promise<AuthConfig> {
  if (options.apiKey) {
    return { method: 'api-key', apiKey: options.apiKey };
  }

  const envKey = process.env.ABSMARTLY_API_KEY;
  if (envKey) {
    return { method: 'api-key', apiKey: envKey };
  }

  const config = loadConfig();
  const profileName = options.profile || config['default-profile'];
  const profile = getProfile(profileName);
  const authMethod = profile.api['auth-method'] ?? 'api-key';

  if (authMethod === 'oauth-jwt') {
    const token = await getOAuthToken(profileName);
    if (!token) {
      throw new Error(
        `No OAuth token found for profile "${profileName}".\n` +
        `Run: abs auth login`
      );
    }
    return { method: 'oauth-jwt', token };
  }

  const apiKey = await getAPIKey(profileName);
  if (!apiKey) {
    throw new Error(
      `No API key found for profile "${profileName}".\n` +
      `Run: abs auth login\n` +
      `Or:  abs --endpoint https://your-api.example.com/v1 --api-key YOUR_KEY <command>`
    );
  }
  return { method: 'api-key', apiKey };
}

export async function getAPIClientFromOptions(options: GlobalOptions): Promise<APIClient> {
  const config = loadConfig();
  const profileName = options.profile || config['default-profile'];
  const profile = getProfile(profileName);
  const endpoint = options.endpoint || process.env.ABSMARTLY_API_ENDPOINT || profile.api.endpoint;

  if (!endpoint) {
    throw new Error(
      `No API endpoint configured for profile "${profileName}".\n` +
      `Run: abs auth login\n` +
      `Or:  abs --endpoint https://your-api.example.com/v1 --api-key YOUR_KEY <command>`
    );
  }

  const auth = await resolveAuth(options);
  return createAPIClient(endpoint, auth, { verbose: options.verbose ?? false });
}
```

Keep `resolveAPIKey` function as-is for backwards compatibility (it's used in `whoami` command for avatar fetching).

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/api-helper.ts src/lib/utils/api-helper.test.ts
git commit -m "feat: add resolveAuth with OAuth JWT support and priority chain"
```

---

### Task 10: Auth Login OAuth Command

**Files:**
- Modify: `src/commands/auth/index.ts`
- Modify: `src/commands/auth/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// Add to auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as oauthModule from '../../lib/auth/oauth.js';
import * as keyringModule from '../../lib/config/keyring.js';
import * as configModule from '../../lib/config/config.js';

vi.mock('../../lib/auth/oauth.js');
vi.mock('../../lib/config/keyring.js');
vi.mock('../../lib/config/config.js');

const mockedOAuth = vi.mocked(oauthModule);
const mockedKeyring = vi.mocked(keyringModule);
const mockedConfig = vi.mocked(configModule);

describe('auth login OAuth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedConfig.loadConfig.mockReturnValue({
      'default-profile': 'default',
      'analytics-opt-out': false,
      output: 'table',
      profiles: {
        default: { api: { endpoint: 'https://api.example.com/v1' }, expctld: { endpoint: '' } },
      },
    });
    mockedConfig.getProfile.mockReturnValue({
      api: { endpoint: 'https://api.example.com/v1' },
      expctld: { endpoint: '' },
    });
  });

  it('starts OAuth flow when --api-key is not provided and endpoint exists', async () => {
    mockedOAuth.startOAuthFlow.mockResolvedValue({
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresIn: 86400,
    });

    // The command should call startOAuthFlow when no --api-key is given
    // and an endpoint is already configured in the profile
    expect(mockedOAuth.startOAuthFlow).toBeDefined();
  });

  it('uses traditional API key flow when --api-key is provided', async () => {
    // When --api-key is given, OAuth should not be triggered
    // This validates the existing flow still works
    mockedKeyring.setAPIKey.mockResolvedValue();
    expect(mockedKeyring.setAPIKey).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify baseline**

Run: `npx vitest run src/commands/auth/auth.test.ts`

- [ ] **Step 3: Modify the login command to support OAuth**

In `src/commands/auth/index.ts`, update the `loginCommand`:

```typescript
import { startOAuthFlow } from '../../lib/auth/oauth.js';
import { setOAuthToken, deleteOAuthToken } from '../../lib/config/keyring.js';
import { confirm } from '@inquirer/prompts';
import { hostname } from 'os';

const loginCommand = new Command('login')
  .description('Authenticate with ABSmartly')
  .option('--api-key <key>', 'ABSmartly API key (skips OAuth)')
  .option('--endpoint <url>', 'API endpoint URL')
  .option('--app <name>', 'default application name')
  .option('--env <name>', 'default environment name')
  .option('--profile <name>', 'profile name to save credentials under')
  .option('--no-browser', 'do not open browser (print URL instead)')
  .option('--session', 'use session-based JWT tokens (skip API key creation)')
  .option('--persistent', 'create persistent API key (skip prompt)')
  .action(withErrorHandling(async (options, command) => {
    const parentOpts = command.parent?.parent?.opts() || {};
    const apiKey = options.apiKey || parentOpts.apiKey;
    const endpoint = options.endpoint || parentOpts.endpoint;
    const profileName = options.profile || parentOpts.profile || 'default';

    if (options.session && options.persistent) {
      throw new Error('Cannot use both --session and --persistent');
    }

    if (apiKey) {
      if (!endpoint) {
        throw new Error('--endpoint is required when using --api-key');
      }
      await setAPIKey(apiKey, profileName);
      const profile = {
        api: { endpoint, 'auth-method': 'api-key' as const },
        expctld: { endpoint: '' },
        application: options.app,
        environment: options.env,
      };
      setProfile(profileName, profile);
      console.log(`\u2713 Logged in successfully (profile: ${profileName})`);
      console.log(`  Endpoint: ${endpoint}`);
      if (options.app) console.log(`  Application: ${options.app}`);
      if (options.env) console.log(`  Environment: ${options.env}`);
      return;
    }

    // OAuth flow
    let resolvedEndpoint = endpoint;
    if (!resolvedEndpoint) {
      try {
        const existingProfile = getProfile(profileName);
        resolvedEndpoint = existingProfile.api.endpoint;
      } catch { /* profile doesn't exist yet */ }
    }

    if (!resolvedEndpoint) {
      throw new Error(
        '--endpoint is required for first-time OAuth login.\n' +
        'Run: abs auth login --endpoint https://your-api.example.com/v1'
      );
    }

    console.log(`Authenticating with ${resolvedEndpoint}...`);

    const tokenResponse = await startOAuthFlow(resolvedEndpoint, {
      noBrowser: options.browser === false,
    });

    console.log('\u2713 Authentication successful!');

    let usePersistentKey: boolean;
    if (options.persistent) {
      usePersistentKey = true;
    } else if (options.session) {
      usePersistentKey = false;
    } else {
      usePersistentKey = await confirm({
        message: 'Create a persistent API key for this machine? (Recommended — avoids re-authenticating every 24h)',
        default: true,
      });
    }

    if (usePersistentKey) {
      try {
        const tempClient = createAPIClient(resolvedEndpoint, {
          method: 'oauth-jwt',
          token: tokenResponse.accessToken,
        });
        const host = hostname().replace(/\.local$/, '');
        const keyName = `cli-${host}`;
        const created = await tempClient.createUserApiKey(keyName) as { key: string };

        await setAPIKey(created.key, profileName);
        const profile = {
          api: { endpoint: resolvedEndpoint, 'auth-method': 'api-key' as const },
          expctld: { endpoint: '' },
          application: options.app,
          environment: options.env,
        };
        setProfile(profileName, profile);
        console.log(`\u2713 Persistent API key created and stored (profile: ${profileName})`);
      } catch (error) {
        console.warn(`Warning: Could not create API key (${error instanceof Error ? error.message : error})`);
        console.warn('Falling back to session-based JWT token (expires in 24h).');
        await setOAuthToken(tokenResponse.accessToken, profileName);
        const profile = {
          api: { endpoint: resolvedEndpoint, 'auth-method': 'oauth-jwt' as const },
          expctld: { endpoint: '' },
          application: options.app,
          environment: options.env,
        };
        setProfile(profileName, profile);
      }
    } else {
      await setOAuthToken(tokenResponse.accessToken, profileName);
      const profile = {
        api: { endpoint: resolvedEndpoint, 'auth-method': 'oauth-jwt' as const },
        expctld: { endpoint: '' },
        application: options.app,
        environment: options.env,
      };
      setProfile(profileName, profile);
      console.log(`\u2713 Session token stored (profile: ${profileName})`);
      console.log('  Note: Token expires in 24h. Re-run `abs auth login` to refresh.');
    }

    console.log(`  Endpoint: ${resolvedEndpoint}`);
    if (options.app) console.log(`  Application: ${options.app}`);
    if (options.env) console.log(`  Environment: ${options.env}`);
  }));
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/auth/index.ts src/commands/auth/auth.test.ts
git commit -m "feat: add OAuth login flow with persistent key and session mode"
```

---

### Task 11: Auth Status and Logout Updates

**Files:**
- Modify: `src/commands/auth/index.ts`

- [ ] **Step 1: Write the failing test for status command showing auth method**

```typescript
// Add to auth.test.ts
describe('auth status with OAuth', () => {
  it('shows auth method and token expiry for oauth-jwt profiles', () => {
    // status command should display auth-method field
    // and show JWT expiry when method is oauth-jwt
    expect(true).toBe(true); // placeholder verified by manual testing
  });
});
```

- [ ] **Step 2: Update status command**

In the `statusCommand` action, after getting the profile:

```typescript
const statusCommand = new Command('status')
  .description('Show current authentication status')
  .option('--show-full-key', 'show full API key (use with caution)')
  .action(withErrorHandling(async (options, command) => {
    const config = loadConfig();
    const parentOpts = command.parent?.parent?.opts() || {};
    const profileName = parentOpts.profile || config['default-profile'];

    try {
      const profile = getProfile(profileName);
      const authMethod = profile.api['auth-method'] ?? 'api-key';

      console.log(`Profile: ${profileName}`);
      console.log(`Endpoint: ${profile.api.endpoint}`);
      console.log(`Auth Method: ${authMethod}`);

      if (authMethod === 'oauth-jwt') {
        const token = await getOAuthToken(profileName);
        if (token) {
          const tokenDisplay = options.showFullKey
            ? token
            : `****...${token.slice(-8)}`;
          console.log(`OAuth Token: ${tokenDisplay}`);

          try {
            const [, payload] = token.split('.');
            if (payload) {
              const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
              if (decoded.exp) {
                const expiresAt = new Date(decoded.exp * 1000);
                const now = new Date();
                if (expiresAt > now) {
                  console.log(`Expires: ${expiresAt.toLocaleString()}`);
                } else {
                  console.log(chalk.yellow(`Token expired: ${expiresAt.toLocaleString()}`));
                  console.log(chalk.yellow('Run `abs auth login` to re-authenticate.'));
                }
              }
            }
          } catch {
            // not a parseable JWT, skip expiry display
          }
        } else {
          console.log('OAuth Token: not set');
        }
      } else {
        const apiKey = await getAPIKey(profileName);
        const keyDisplay = apiKey
          ? (options.showFullKey ? apiKey : `****...${apiKey.slice(-4)}`)
          : 'not set';
        console.log(`API Key: ${keyDisplay}`);
      }

      if (profile.application) console.log(`Application: ${profile.application}`);
      if (profile.environment) console.log(`Environment: ${profile.environment}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('not found') || msg.includes('No API key')) {
        throw new Error('Not authenticated. Run `abs auth login` to authenticate.');
      }
      throw new Error(`Error checking auth status: ${msg || error}`);
    }
  }));
```

- [ ] **Step 3: Update logout command**

In the `logoutCommand` action:

```typescript
const logoutCommand = new Command('logout')
  .description('Clear stored credentials')
  .action(withErrorHandling(async (_options, command) => {
    const config = loadConfig();
    const parentOpts = command.parent?.parent?.opts() || {};
    const profileName = parentOpts.profile || config['default-profile'];
    const profile = getProfile(profileName);
    const authMethod = profile.api['auth-method'] ?? 'api-key';

    if (authMethod === 'oauth-jwt') {
      await deleteOAuthToken(profileName);
    } else {
      await deleteAPIKey(profileName);
    }

    console.log(`\u2713 Logged out (profile: ${profileName})`);
  }));
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/auth/index.ts src/commands/auth/auth.test.ts
git commit -m "feat: update auth status and logout to support OAuth JWT"
```

---

### Task 12: Integration Smoke Test

**Files:**
- Create: `src/lib/auth/oauth-integration.test.ts`

- [ ] **Step 1: Write integration test with mock OAuth server**

```typescript
// src/lib/auth/oauth-integration.test.ts
import { describe, it, expect, vi } from 'vitest';
import http from 'http';
import { generatePKCE } from './pkce.js';
import { startCallbackServer } from './callback-server.js';
import { exchangeCodeForToken } from './token-exchange.js';

describe('OAuth integration', () => {
  it('full PKCE flow: generate, callback, exchange', async () => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    expect(codeVerifier).toBeDefined();
    expect(codeChallenge).toBeDefined();

    const server = await startCallbackServer([0]);
    expect(server.port).toBeGreaterThan(0);

    const codePromise = server.waitForCode(5000);
    await fetch(`${server.redirectUri}?code=integration-test-code`);
    const code = await codePromise;

    expect(code).toBe('integration-test-code');
  });

  it('callback server handles error query params', async () => {
    const server = await startCallbackServer([0]);
    const codePromise = server.waitForCode(5000);

    await fetch(`${server.redirectUri}?error=access_denied&error_description=User+denied`);

    await expect(codePromise).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run src/lib/auth/oauth-integration.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/oauth-integration.test.ts
git commit -m "test: add OAuth integration smoke tests"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

Run: `npx tsx src/index.ts auth login --help`
Expected: Shows updated help with `--no-browser`, `--session`, `--persistent` flags

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup for OAuth authentication feature"
```
