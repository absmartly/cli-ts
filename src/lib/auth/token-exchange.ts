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
    const isAxiosError =
      (axios.isAxiosError && axios.isAxiosError(error)) ||
      (error !== null && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError === true);

    if (isAxiosError) {
      const axiosError = error as { response?: { data?: { error_description?: string; error?: string } } };
      const data = axiosError.response?.data;
      if (data) {
        throw new Error(data.error_description || data.error || 'Token exchange failed');
      }
    }
    throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : error}`);
  }
}
