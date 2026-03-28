import open from 'open';
import { generatePKCE } from './pkce.js';
import { startCallbackServer } from './callback-server.js';
import { exchangeCodeForToken, type TokenResponse } from './token-exchange.js';

const OAUTH_CLIENT_ID = 'mcp-absmartly-universal';
const OAUTH_SCOPES = 'mcp:access';
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
