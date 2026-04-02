import type { AuthConfig } from '../../lib/api/axios-adapter.js';

export const isLiveMode = process.env.USE_LIVE_API === '1';

export const TEST_BASE_URL = isLiveMode
  ? process.env.LIVE_API_URL!
  : 'https://api.absmartly.com/v1';

function resolveLiveAuth(): string | AuthConfig {
  if (process.env.LIVE_OAUTH_TOKEN) {
    return { method: 'oauth-jwt', token: process.env.LIVE_OAUTH_TOKEN };
  }
  return process.env.LIVE_API_KEY!;
}

export const TEST_API_KEY: string | AuthConfig = isLiveMode
  ? resolveLiveAuth()
  : 'test-api-key';

export const TEST_TIMEOUT = isLiveMode ? 10000 : undefined;
