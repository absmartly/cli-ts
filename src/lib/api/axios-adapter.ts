import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import axiosRetry from 'axios-retry';
import { version } from '../utils/version.js';
import { APIError } from '../../api-client/http-client.js';
import type { HttpClient, HttpRequestConfig, HttpResponse } from '../../api-client/http-client.js';

const DEFAULT_TIMEOUT = 30000;
const RETRY_COUNT = 3;

const NON_IDEMPOTENT_PUT_PATHS = ['/start', '/stop', '/restart', '/development', '/full_on'];

const IDEMPOTENT_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];

/**
 * Turn a Prisma-wrapped Postgres error into a readable two-line summary.
 * Input looks like (whitespace collapsed for this comment):
 *   Invalid `prisma.metric.create()` invocation: ... ConnectorError { ...
 *     PostgresError { code: "23514", message: "new row for relation \"metrics\"
 *     violates check constraint \"chk_goal_ratio\"", severity: "ERROR",
 *     detail: Some("Failing row contains (...)"), column: None, hint: None }
 *     ... }
 *
 * Returns:
 *   message: new row for relation "metrics" violates check constraint "chk_goal_ratio"
 *   detail: Failing row contains (...)
 *
 * Returns `undefined` when the input doesn't look like a Prisma error, so the
 * caller can fall back to the raw body.
 */
export function formatPrismaError(text: string): string | undefined {
  if (!text.includes('PostgresError') && !text.includes('prisma.')) return undefined;

  const message = extractRustString(text, /\bmessage:\s*"/);
  if (message === undefined) return undefined;

  const lines = [`message: ${message}`];
  const detail = extractRustString(text, /\bdetail:\s*Some\("/);
  if (detail !== undefined) lines.push(`detail: ${detail}`);
  return lines.join('\n');
}

/**
 * Scan forward from the first match of `startRe` and return the contents of
 * the following Rust-debug-formatted double-quoted string, unescaping `\"`
 * and `\\` (the only escapes Rust's default Debug impl for &str emits).
 */
function extractRustString(text: string, startRe: RegExp): string | undefined {
  const match = startRe.exec(text);
  if (!match) return undefined;
  let i = match.index + match[0].length;
  let out = '';
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === '\\' && i + 1 < text.length) {
      const next = text[i + 1]!;
      if (next === '"' || next === '\\') {
        out += next;
        i += 2;
        continue;
      }
      if (next === 'n') {
        out += '\n';
        i += 2;
        continue;
      }
      out += next;
      i += 2;
      continue;
    }
    if (ch === '"') return out;
    out += ch;
    i += 1;
  }
  return undefined;
}


export type AuthConfig =
  | { method: 'api-key'; apiKey: string }
  | { method: 'oauth-jwt'; token: string; onExpired?: () => Promise<AuthConfig> };

export class AxiosHttpClient implements HttpClient {
  private client: AxiosInstance;
  private verbose: boolean;
  protected authConfig: AuthConfig;

  constructor(
    endpoint: string,
    auth: string | AuthConfig,
    options: { verbose?: boolean; timeout?: number; insecure?: boolean } = {}
  ) {
    this.verbose = options.verbose ?? false;

    this.authConfig = typeof auth === 'string' ? { method: 'api-key', apiKey: auth } : auth;

    const authHeader =
      this.authConfig.method === 'api-key'
        ? `Api-Key ${this.authConfig.apiKey}`
        : `Bearer ${this.authConfig.token}`;

    this.client = axios.create({
      baseURL: endpoint,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      ...(options.insecure && { httpsAgent: new https.Agent({ rejectUnauthorized: false }) }),
      headers: {
        Authorization: authHeader,
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

        if (error.response?.status === 429) return true;

        return (error.response?.status ?? 0) >= 500;
      },
    });

    if (this.verbose) {
      this.client.interceptors.request.use((config) => {
        console.error(`[DEBUG] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      });
    }

    if (this.authConfig.method === 'oauth-jwt' && this.authConfig.onExpired) {
      const onExpired = this.authConfig.onExpired;
      let isRefreshing = false;

      this.client.interceptors.response.use(undefined, async (error: unknown) => {
        if (!axios.isAxiosError(error) || error.response?.status !== 401 || isRefreshing) {
          return Promise.reject(error);
        }

        isRefreshing = true;
        try {
          const newAuth = await onExpired();
          const newHeader =
            newAuth.method === 'api-key' ? `Api-Key ${newAuth.apiKey}` : `Bearer ${newAuth.token}`;

          this.client.defaults.headers.common['Authorization'] = newHeader;
          this.authConfig = newAuth;

          if (error.config) {
            error.config.headers['Authorization'] = newHeader;
            return this.client.request(error.config);
          }
        } catch (refreshError) {
          const refreshMsg =
            refreshError instanceof Error ? refreshError.message : String(refreshError);
          console.error(`Warning: Token refresh failed: ${refreshMsg}`);
          const wrappedError = new APIError(
            `Authentication failed: token refresh unsuccessful (${refreshMsg}).\n` +
              `Run: abs auth login`,
            401,
            error.response?.data
          );
          return Promise.reject(wrappedError);
        } finally {
          isRefreshing = false;
        }

        return Promise.reject(error);
      });
    }

    this.client.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (axios.isAxiosError(error)) {
          throw this.handleError(error);
        }
        throw error;
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

  getBaseUrl(): string {
    return this.client.defaults.baseURL || '';
  }

  getAuthHeader(): string {
    const headers = this.client.defaults.headers;
    return (
      (headers.common?.['Authorization'] as string) ?? (headers['Authorization'] as string) ?? ''
    );
  }

  private handleError(error: AxiosError): APIError {
    const endpoint = error.config?.url || 'unknown endpoint';
    const method = error.config?.method?.toUpperCase() || 'unknown method';
    const status = error.response?.status;
    const responseData = error.response?.data as Record<string, unknown> | undefined;

    // Surface a human-readable body message from common error shapes.
    // The backend returns {errors: [...]} for validation failures (handled by
    // handleCommandError when the APIError reaches the command layer) and may
    // return {message: "..."} or a raw string for other errors.
    const rawBodyMessage = (() => {
      if (!responseData) return undefined;
      if (typeof responseData === 'string') return responseData;
      const msg = responseData.message ?? responseData.error ?? responseData.detail;
      return typeof msg === 'string' ? msg : undefined;
    })();

    // DB errors from Prisma come back with a long wrapper that buries the two
    // parts an operator actually needs: the Postgres `message` and `detail`.
    // When we recognise the shape, render just those so the user sees
    //   message: new row for relation "metrics" violates check constraint "chk_goal_ratio"
    //   detail: Failing row contains (...)
    // instead of the full ConnectorError/PostgresError debug dump.
    const bodyMessage = rawBodyMessage ? formatPrismaError(rawBodyMessage) ?? rawBodyMessage : undefined;

    // DB check-constraint failures (5xx) often bubble up cryptic Prisma text.
    // Detect the goal_ratio constraint and add a concrete hint.
    const constraintHint = (() => {
      const haystack = `${error.message ?? ''} ${rawBodyMessage ?? ''}`;
      if (haystack.includes('chk_goal_ratio')) {
        return (
          `Hint: goal_ratio needs consistent numerator/denominator fields. Verify\n` +
          `that goal_id/value_source_property match the numerator_type and that\n` +
          `denominator_goal_id/denominator_value_source_property match the\n` +
          `denominator_type. Empty strings are not equivalent to null.`
        );
      }
      return undefined;
    })();

    let message: string;
    switch (status) {
      case 401:
        message =
          `Unauthorized: Invalid or expired API key.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          `Run: abs auth login --api-key YOUR_KEY`;
        break;
      case 403:
        message =
          `Forbidden: Insufficient permissions for this operation.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          `Please check your API key has the required permissions.`;
        break;
      case 404:
        message = `Not found: Resource does not exist.\n` + `Endpoint: ${method} ${endpoint}`;
        break;
      case 429: {
        const retryAfter = error.response?.headers['retry-after'];
        message =
          `Rate limit exceeded.\n` +
          `Endpoint: ${method} ${endpoint}\n` +
          (retryAfter ? `Retry after: ${retryAfter} seconds` : 'Please try again later.');
        break;
      }
      default:
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          message =
            `Cannot connect to API server.\n` +
            `Endpoint: ${endpoint}\n` +
            `Please check your network connection and API endpoint configuration.`;
        } else if (error.code === 'ETIMEDOUT') {
          message =
            `Request timeout.\n` +
            `Endpoint: ${method} ${endpoint}\n` +
            `The server took too long to respond. Please try again.`;
        } else {
          const lines = [`API error: ${error.message || 'unknown error'}`, `Endpoint: ${method} ${endpoint}`];
          if (bodyMessage) lines.push('', bodyMessage);
          if (constraintHint) lines.push('', constraintHint);
          message = lines.join('\n');
        }
    }

    return new APIError(message, status, error.response?.data);
  }
}

export function createAxiosHttpClient(
  endpoint: string,
  auth: string | AuthConfig,
  options?: { verbose?: boolean; timeout?: number; insecure?: boolean }
): AxiosHttpClient {
  return new AxiosHttpClient(endpoint, auth, options);
}
