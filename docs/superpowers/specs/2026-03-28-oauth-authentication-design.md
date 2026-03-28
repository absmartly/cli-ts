# OAuth Authentication for ABsmartly CLI

## Overview

Add OAuth (Authorization Code + PKCE) as an alternative authentication method for the CLI. After OAuth, users choose between creating a persistent API key (recommended) or using session-based JWT tokens. Reuses the existing backend OAuth provider (`mcp-absmartly-universal` client). No backend changes required.

SSO/IdP integration comes for free — the backend handles external IdP redirects transparently, and the CLI only needs to talk to the backend's OAuth provider.

## OAuth Flow & User Experience

### `auth login` (new default — interactive OAuth)

Requires `--endpoint` if no profile exists yet (same as today). If a profile already has an endpoint configured, it is reused.

1. CLI generates PKCE code verifier + S256 challenge
2. Starts a local HTTP server on port 8787 (matching the backend's allowed redirect URI `http://localhost:8787/oauth/callback`). If port 8787 is busy, falls back to port 8080 with HTTPS, then to headless mode.
3. Opens browser to `{endpoint}/auth/oauth/authorize` with params:
   - `response_type=code`
   - `client_id=mcp-absmartly-universal`
   - `redirect_uri=http://localhost:8787/oauth/callback` (or `https://localhost:8080/oauth/callback`)
   - `code_challenge={challenge}`
   - `code_challenge_method=S256`
   - `scope=mcp:access user:info`
4. If browser can't open (headless), prints the URL and tells user to visit it manually
5. Receives callback with authorization code
6. Exchanges code for JWT access token via `POST /auth/oauth/token`
7. Prompts user: "Create a persistent API key for this machine? (Recommended — avoids re-authenticating every 24h)"
   - **Yes (default):** Uses JWT to call `POST /auth/current-user/api_keys` with name `cli-{hostname}`, stores the API key in keyring, discards JWT
   - **No:** Stores JWT in keyring, CLI uses `Bearer` token for requests
8. Stores auth method type (`api-key` or `oauth-jwt`) in the profile config

### `auth login --api-key <key> --endpoint <url>` (preserved)

Works exactly as today. No changes.

### Headless fallback

If the local server can't bind or browser can't open, the CLI prints the authorization URL and waits for the user to paste the callback URL or authorization code manually.

## Token Storage & Profile Config

### Keyring keys per profile

- `api-key` / `api-key-{profile}` — existing, unchanged
- `oauth-token` / `oauth-token-{profile}` — new, stores JWT when user chooses session mode

### Profile config changes

```yaml
profiles:
  default:
    api:
      endpoint: https://api.absmartly.com
      auth-method: api-key    # "api-key" | "oauth-jwt"
    application: my-app
    environment: production
```

The `auth-method` field tells the CLI which credential to read from keyring and which `Authorization` header to use:

- `api-key` → reads `api-key` from keyring → sends `Authorization: Api-Key {key}`
- `oauth-jwt` → reads `oauth-token` from keyring → sends `Authorization: Bearer {jwt}`

Default is `api-key` (backwards compatible — existing profiles without `auth-method` behave as today).

`auth logout` clears whichever credential the profile uses (API key or JWT).

`auth status` shows the auth method in use, token expiry for JWT mode, and masked credentials.

## HTTP Client Changes

### `axios-adapter.ts`

The `AxiosHttpClient` constructor changes from accepting `apiKey: string` to accepting an auth config:

```typescript
type AuthConfig =
  | { method: 'api-key'; apiKey: string }
  | { method: 'oauth-jwt'; token: string; onExpired: () => Promise<AuthConfig> }
```

- `api-key` mode: sets `Authorization: Api-Key {apiKey}` (same as today)
- `oauth-jwt` mode: sets `Authorization: Bearer {token}`

### Auto re-auth on expiry (JWT mode only)

- On 401 response, the client calls `onExpired()` which triggers the OAuth flow again
- The new token is stored and the failed request is retried once
- If re-auth fails or the retry still 401s, the error propagates normally

### `api-helper.ts`

`resolveAuth(options)` replaces the separate `resolveAPIKey()`:

- Reads `auth-method` from profile config
- Priority chain: CLI flags (`--api-key` always wins) → env vars → profile-based resolution
- Returns the appropriate `AuthConfig` object

`getAPIClientFromOptions()` updated to use `resolveAuth()` instead of `resolveAPIKey()`.

## OAuth Module

### New file: `src/lib/auth/oauth.ts`

Core OAuth logic isolated in one module:

**`startOAuthFlow(endpoint, options)`** — orchestrates the full flow:

1. Generates PKCE pair (code verifier + S256 challenge)
2. Calls `startCallbackServer()` to bind a local HTTP server
3. Builds authorization URL
4. Opens browser (via `open` package) or prints URL for headless
5. Waits for callback (with timeout, 5 minutes)
6. Exchanges code for token via `POST /auth/oauth/token`
7. Returns the JWT access token

**`startCallbackServer()`** — ephemeral HTTP server:

- Tries port 8787 first (HTTP), falls back to 8080 (HTTPS), then headless mode
- Must match backend's allowed redirect URIs: `http://localhost:8787/oauth/callback` or `https://localhost:8080/oauth/callback`
- Serves a single route: `GET /oauth/callback`
- Extracts `code` from query params
- Returns a simple HTML page: "Authentication successful! You can close this tab."
- Shuts down after receiving the callback or on timeout

**`exchangeCodeForToken(endpoint, code, codeVerifier, redirectUri)`** — `POST /auth/oauth/token` with `grant_type=authorization_code`

**`generatePKCE()`** — generates random code verifier (43-128 chars) and S256 challenge

Headless fallback is handled within `startOAuthFlow`: if `open` fails or `--no-browser` flag is passed, it prints the URL and prompts the user to paste the callback URL.

**New dependency:** `open` (for launching browser).

## API Key Auto-Creation

When user chooses persistent mode after OAuth:

- Calls `POST /auth/current-user/api_keys` with the JWT as Bearer token
- Key name: `cli-{hostname}` (e.g. `cli-joalves-macbook`)
- If a key with that name already exists, appends a short timestamp: `cli-{hostname}-{timestamp}`
- Stores the returned API key in keyring, sets `auth-method: api-key` in profile
- Discards the JWT

## Error Handling

| Scenario | Behavior |
|---|---|
| Browser fails to open | Print URL, wait for manual paste |
| Local server can't bind | Fall back to manual code paste |
| User doesn't complete auth within 5 min | Timeout error, suggest retrying |
| Invalid/expired authorization code | Clear error, suggest retrying |
| Token exchange fails | Show backend error message |
| API key creation fails (after OAuth) | Fall back to JWT mode, warn user about 24h expiry |
| JWT expired mid-session (401) | Auto re-auth via OAuth, retry request |
| Re-auth fails | Propagate 401 error, suggest `auth login` |

## `auth login` Flags

| Flag | Purpose |
|---|---|
| `--api-key <key>` | Manual API key (existing, bypasses OAuth) |
| `--endpoint <url>` | API endpoint (existing) |
| `--profile <name>` | Target profile (existing) |
| `--no-browser` | Force headless/manual mode |
| `--session` | Skip API key prompt, use JWT directly |
| `--persistent` | Skip prompt, create API key directly |

If both `--session` and `--persistent` are passed, error out.

## Testing Strategy

### Unit tests

- `oauth.ts` — mock HTTP responses for token exchange, mock `open` for browser launch, test PKCE generation, test callback server lifecycle, test timeout behavior, test headless fallback
- `axios-adapter.ts` — test both `Api-Key` and `Bearer` header modes, test auto re-auth on 401 in JWT mode, test retry-once-then-propagate behavior
- `api-helper.ts` — test `resolveAuth()` priority chain (flags → env → profile), test `auth-method` config reading
- `keyring.ts` — test new `oauth-token` key storage/retrieval/deletion
- `auth/index.ts` — test new `auth login` OAuth flow with mocked OAuth module, test `--session`/`--persistent`/`--no-browser` flags, test `auth status` showing JWT expiry

### Integration tests

- End-to-end OAuth flow with a mock OAuth server (fake `/auth/oauth/authorize` and `/auth/oauth/token` endpoints)
- Test the full login → API key creation → subsequent request flow
- Test login → JWT session → token expiry → re-auth flow
