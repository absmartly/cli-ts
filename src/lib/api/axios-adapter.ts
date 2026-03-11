import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { version } from '../utils/version.js';
import type {
  HttpClient,
  HttpRequestConfig,
  HttpResponse,
  APIError,
} from '../../api-client/http-client.js';

const DEFAULT_TIMEOUT = 30000;
const RETRY_COUNT = 3;

const NON_IDEMPOTENT_PUT_PATHS = [
  '/start', '/stop', '/restart', '/development', '/full_on',
];

const IDEMPOTENT_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];

export class AxiosHttpClient implements HttpClient {
  private client: AxiosInstance;
  private verbose: boolean;

  constructor(endpoint: string, apiKey: string, options: { verbose?: boolean; timeout?: number } = {}) {
    this.verbose = options.verbose ?? false;

    this.client = axios.create({
      baseURL: endpoint,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': `absmartly-cli/${version}`,
      },
    });

    axiosRetry(this.client, {
      retries: RETRY_COUNT,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error: AxiosError) => {
        const method = error.config?.method?.toUpperCase();
        const url = error.config?.url ?? '';

        if (method === 'PUT' && NON_IDEMPOTENT_PUT_PATHS.some((p) => url.endsWith(p))) {
          return false;
        }

        const isIdempotent = IDEMPOTENT_METHODS.includes(method ?? '');
        if (!isIdempotent) return false;

        if (axiosRetry.isNetworkError(error)) return true;

        return (error.response?.status ?? 0) >= 500;
      },
    });

    if (this.verbose) {
      this.client.interceptors.request.use((config) => {
        console.error(`[DEBUG] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      });
    }

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        throw this.handleError(error);
      }
    );
  }

  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const axiosConfig: Record<string, unknown> = {
      method: config.method,
      url: config.url,
    };

    if (config.headers !== undefined) {
      axiosConfig.headers = config.headers;
    }
    if (config.params !== undefined) {
      axiosConfig.params = config.params;
    }
    if (config.data !== undefined) {
      axiosConfig.data = config.data;
    }
    if (config.timeout !== undefined) {
      axiosConfig.timeout = config.timeout;
    }

    const response = await this.client.request(axiosConfig);

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    return {
      status: response.status,
      data: response.data as T,
      headers,
    };
  }

  private handleError(error: AxiosError): APIError {
    const apiError: APIError = new Error('API error');
    if (error.response?.status !== undefined) {
      apiError.statusCode = error.response.status;
    }
    if (error.response?.data !== undefined) {
      apiError.response = error.response.data;
    }

    const endpoint = error.config?.url || 'unknown endpoint';
    const method = error.config?.method?.toUpperCase() || 'unknown method';
    const status = error.response?.status;

    switch (status) {
      case 401:
        apiError.message =
          `Unauthorized: Invalid or expired API key.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          `Run: abs auth login --api-key YOUR_KEY`;
        break;
      case 403:
        apiError.message =
          `Forbidden: Insufficient permissions for this operation.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          `Please check your API key has the required permissions.`;
        break;
      case 404:
        apiError.message =
          `Not found: Resource does not exist.\n` +
          `Endpoint: ${method} ${endpoint}`;
        break;
      case 429: {
        const retryAfter = error.response?.headers['retry-after'];
        apiError.message =
          `Rate limit exceeded.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          (retryAfter ? `Retry after: ${retryAfter} seconds` : 'Please try again later.');
        break;
      }
      default:
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          apiError.message =
            `Cannot connect to API server.\n` +
            `Endpoint: ${endpoint}\n` +
            `Please check your network connection and API endpoint configuration.`;
        } else if (error.code === 'ETIMEDOUT') {
          apiError.message =
            `Request timeout.\n` +
            `Endpoint: ${method} ${endpoint}\n` +
            `The server took too long to respond. Please try again.`;
        } else {
          apiError.message =
            `API error: ${error.message || 'unknown error'}\n` +
            `Endpoint: ${method} ${endpoint}`;
        }
    }

    return apiError;
  }
}

export function createAxiosHttpClient(
  endpoint: string,
  apiKey: string,
  options?: { verbose?: boolean; timeout?: number }
): AxiosHttpClient {
  return new AxiosHttpClient(endpoint, apiKey, options);
}
