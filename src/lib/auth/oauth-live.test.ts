import { describe, it, expect, afterAll } from 'vitest';
import axios from 'axios';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';
import { createAPIClient } from '../api/client.js';
import { generatePKCE } from './pkce.js';
import { startCallbackServer } from './callback-server.js';
import { exchangeCodeForToken } from './token-exchange.js';

const LIVE_USERNAME = process.env.LIVE_USERNAME;
const LIVE_PASSWORD = process.env.LIVE_PASSWORD;

function getOAuthBaseUrl(endpoint: string): string {
  return endpoint.replace(/\/v\d+\/?$/, '');
}

describe.runIf(isLiveMode)('OAuth live API tests', () => {
  const client = createAPIClient(TEST_BASE_URL, TEST_API_KEY);

  describe('OAuth discovery endpoint', () => {
    it('returns OAuth authorization server metadata', async () => {
      const baseUrl = getOAuthBaseUrl(TEST_BASE_URL);
      const response = await axios.get(
        `${baseUrl}/auth/oauth/.well-known/oauth-authorization-server`,
        { httpsAgent: new (await import('https')).Agent({ rejectUnauthorized: false }) }
      );

      expect(response.status).toBe(200);
      expect(response.data.issuer).toBeDefined();
      expect(response.data.authorization_endpoint).toContain('/auth/oauth/authorize');
      expect(response.data.token_endpoint).toContain('/auth/oauth/token');
      expect(response.data.scopes_supported).toContain('mcp:access');
      expect(response.data.grant_types_supported).toContain('authorization_code');
      expect(response.data.code_challenge_methods_supported).toContain('S256');
      expect(response.data.response_types_supported).toContain('code');
    });
  });

  describe('Current user endpoint', () => {
    it('fetches current user with API key auth', async () => {
      const user = await client.getCurrentUser();
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(typeof user.id).toBe('number');
    });
  });

  describe('API key CRUD lifecycle', () => {
    let createdKeyId: number | undefined;

    afterAll(async () => {
      if (createdKeyId) {
        try { await client.deleteUserApiKey(createdKeyId); } catch {}
      }
    });

    it('creates, retrieves, lists, and deletes a personal API key', async () => {
      const keyName = `cli-vitest-${Date.now()}`;
      const created = await client.createUserApiKey(keyName) as { id: number; name: string; key: string };
      createdKeyId = created.id;

      expect(created.id).toBeDefined();
      expect(created.name).toBe(keyName);
      expect(created.key).toBeDefined();
      expect(typeof created.key).toBe('string');

      const fetched = await client.getUserApiKey(created.id) as { id: number; name: string };
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe(keyName);

      const keys = await client.listUserApiKeys() as { id: number }[];
      expect(keys.some(k => k.id === created.id)).toBe(true);

      await client.deleteUserApiKey(created.id);
      createdKeyId = undefined;

      try {
        await client.getUserApiKey(created.id);
        expect.fail('Should have thrown 404');
      } catch (error) {
        expect((error as any).statusCode || (error as any).status).toBe(404);
      }
    });
  });

  describe.runIf(LIVE_USERNAME && LIVE_PASSWORD)('OAuth browser flow', () => {
    it('completes full OAuth flow and gets a valid JWT', async () => {
      const { chromium } = await import('playwright');

      const { codeVerifier, codeChallenge } = generatePKCE();
      const server = await startCallbackServer();

      const baseUrl = getOAuthBaseUrl(TEST_BASE_URL);
      const authUrl = new URL(`${baseUrl}/auth/oauth/authorize`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', 'mcp-absmartly-universal');
      authUrl.searchParams.set('redirect_uri', server.redirectUri);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('scope', 'mcp:access user:info');

      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();

      try {
        const codePromise = server.waitForCode(30000);

        await page.goto(authUrl.toString());

        await page.waitForSelector('input[name="email"]', { timeout: 10000 });
        await page.fill('input[name="email"]', LIVE_USERNAME!);
        await page.fill('input[name="password"]', LIVE_PASSWORD!);
        await page.click('button[type="submit"]');

        const code = await codePromise;
        expect(code).toBeDefined();
        expect(typeof code).toBe('string');

        const tokenResponse = await exchangeCodeForToken({
          endpoint: TEST_BASE_URL,
          code,
          codeVerifier,
          redirectUri: server.redirectUri,
          clientId: 'mcp-absmartly-universal',
        });

        expect(tokenResponse.accessToken).toBeDefined();
        expect(tokenResponse.tokenType).toBe('Bearer');
        expect(tokenResponse.expiresIn).toBeGreaterThan(0);

        const jwtClient = createAPIClient(TEST_BASE_URL, {
          method: 'oauth-jwt',
          token: tokenResponse.accessToken,
        });
        const user = await jwtClient.getCurrentUser();
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
      } finally {
        await browser.close();
        server.close();
      }
    }, 60000);

    it('creates persistent API key after OAuth flow', async () => {
      const { chromium } = await import('playwright');

      const { codeVerifier, codeChallenge } = generatePKCE();
      const server = await startCallbackServer();

      const baseUrl = getOAuthBaseUrl(TEST_BASE_URL);
      const authUrl = new URL(`${baseUrl}/auth/oauth/authorize`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', 'mcp-absmartly-universal');
      authUrl.searchParams.set('redirect_uri', server.redirectUri);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('scope', 'mcp:access user:info');

      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      let createdKeyId: number | undefined;

      try {
        const codePromise = server.waitForCode(30000);

        await page.goto(authUrl.toString());
        await page.waitForSelector('input[name="email"]', { timeout: 10000 });
        await page.fill('input[name="email"]', LIVE_USERNAME!);
        await page.fill('input[name="password"]', LIVE_PASSWORD!);
        await page.click('button[type="submit"]');

        const code = await codePromise;
        const tokenResponse = await exchangeCodeForToken({
          endpoint: TEST_BASE_URL,
          code,
          codeVerifier,
          redirectUri: server.redirectUri,
          clientId: 'mcp-absmartly-universal',
        });

        const jwtClient = createAPIClient(TEST_BASE_URL, {
          method: 'oauth-jwt',
          token: tokenResponse.accessToken,
        });

        const keyName = `cli-vitest-persistent-${Date.now()}`;
        const created = await jwtClient.createUserApiKey(keyName) as { id: number; key: string };
        createdKeyId = created.id;
        expect(created.key).toBeDefined();

        const apiKeyClient = createAPIClient(TEST_BASE_URL, created.key);
        const user = await apiKeyClient.getCurrentUser();
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
      } finally {
        if (createdKeyId) {
          try { await client.deleteUserApiKey(createdKeyId); } catch {}
        }
        await browser.close();
        server.close();
      }
    }, 60000);
  });
});
