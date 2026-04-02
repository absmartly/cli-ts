import { APIClient as EngineAPIClient } from '../../api-client/api-client.js';
import { createAxiosHttpClient, type AuthConfig } from './axios-adapter.js';

export interface ClientOptions {
  verbose?: boolean;
  timeout?: number;
  insecure?: boolean;
}

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
