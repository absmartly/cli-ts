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
