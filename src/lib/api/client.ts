import { APIClient as EngineAPIClient } from '../../api-client/api-client.js';
import { createAxiosHttpClient } from './axios-adapter.js';

export interface ClientOptions {
  verbose?: boolean;
  timeout?: number;
}

export class APIClient extends EngineAPIClient {
  constructor(endpoint: string, apiKey: string, options: ClientOptions = {}) {
    const httpClient = createAxiosHttpClient(endpoint, apiKey, options);
    super(httpClient);
  }
}

export function createAPIClient(
  endpoint: string,
  apiKey: string,
  options?: ClientOptions
): APIClient {
  return new APIClient(endpoint, apiKey, options);
}
