import axios from 'axios';
import https from 'https';
import { stripApiVersionPath } from '../utils/url.js';

export interface TokenExchangeParams {
  endpoint: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  insecure?: boolean;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

export async function exchangeCodeForToken(params: TokenExchangeParams): Promise<TokenResponse> {
  const baseUrl = stripApiVersionPath(params.endpoint);
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
      ...(params.insecure && { httpsAgent: new https.Agent({ rejectUnauthorized: false }) }),
    });

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      scope: response.data.scope,
    };
  } catch (error: unknown) {
    const isAxiosError =
      (axios.isAxiosError && axios.isAxiosError(error)) ||
      (error !== null &&
        typeof error === 'object' &&
        'isAxiosError' in error &&
        error.isAxiosError === true);

    if (isAxiosError) {
      const axiosError = error as {
        response?: { data?: { error_description?: string; error?: string } };
      };
      const data = axiosError.response?.data;
      if (data) {
        throw new Error(data.error_description || data.error || 'Token exchange failed');
      }
    }
    const msg = error instanceof Error ? error.message : String(error);
    let tip = '';
    if (msg.includes('self-signed certificate')) {
      tip = '\nTip: Use --insecure to allow self-signed certificates.';
    } else if (msg.includes('socket hang up') && params.endpoint.startsWith('http://')) {
      tip = `\nTip: The server may require HTTPS. Try: ${params.endpoint.replace('http://', 'https://')}`;
    }
    throw new Error(`Token exchange failed: ${msg}${tip}`);
  }
}
