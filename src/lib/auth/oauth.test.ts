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
    expect(url.searchParams.get('scope')).toBe('mcp:access');
  });

  it('handles noBrowser option by not calling open', async () => {
    const openModule = await import('open');
    const mockedOpen = vi.mocked(openModule.default);

    await startOAuthFlow('https://api.example.com/v1', { noBrowser: true });

    expect(mockedOpen).not.toHaveBeenCalled();
  });
});
