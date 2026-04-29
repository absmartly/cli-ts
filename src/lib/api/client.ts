import { APIClient as EngineAPIClient } from '../../api-client/api-client.js';
import {
  createAxiosHttpClient,
  type AuthConfig,
  type AxiosHttpClientOptions,
} from './axios-adapter.js';

export type ClientOptions = AxiosHttpClientOptions;

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
