import { describe, it, expect } from 'vitest';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  redactHeaders,
  formatRequestHTTP,
  formatRequestCurl,
  formatResponseHTTP,
  formatNetworkError,
  type FormatOptions,
} from './request-logger.js';

const NO_COLOR: FormatOptions = { showSecrets: false, color: false };
const WITH_COLOR: FormatOptions = { showSecrets: false, color: true };
const WITH_SECRETS: FormatOptions = { showSecrets: true, color: false };

const ANSI_RE = /\x1b\[[0-9;]*m/;

function makeConfig(
  overrides: Partial<InternalAxiosRequestConfig> = {}
): InternalAxiosRequestConfig {
  return {
    method: 'GET',
    url: '/experiments',
    baseURL: 'https://api.example.com/v1',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Api-Key secret-key-123',
      'User-Agent': 'absmartly-cli/1.0.0',
    },
    ...overrides,
  } as InternalAxiosRequestConfig;
}

function makeResponse(overrides: Partial<AxiosResponse> = {}): AxiosResponse {
  return {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    data: undefined,
    config: makeConfig(),
    ...overrides,
  } as AxiosResponse;
}

describe('redactHeaders', () => {
  it('redacts Authorization by default while preserving the scheme', () => {
    const out = redactHeaders(
      { Authorization: 'Api-Key abcdef', 'Content-Type': 'application/json' },
      false
    );
    expect(out.Authorization).toBe('Api-Key ***');
    expect(out['Content-Type']).toBe('application/json');
  });

  it('preserves Bearer scheme when redacting', () => {
    const out = redactHeaders({ Authorization: 'Bearer abcdef.token.value' }, false);
    expect(out.Authorization).toBe('Bearer ***');
  });

  it('falls back to plain *** when no scheme prefix', () => {
    const out = redactHeaders({ Authorization: 'rawvaluenoSpace' }, false);
    expect(out.Authorization).toBe('***');
  });

  it('with showSecrets: true leaves Authorization intact', () => {
    const out = redactHeaders({ Authorization: 'Api-Key abcdef' }, true);
    expect(out.Authorization).toBe('Api-Key abcdef');
  });

  it('matches Authorization case-insensitively', () => {
    const out = redactHeaders({ authorization: 'Api-Key abc', AUTHORIZATION: 'Bearer xyz' }, false);
    expect(out.authorization).toBe('Api-Key ***');
    expect(out.AUTHORIZATION).toBe('Bearer ***');
  });
});

describe('formatRequestHTTP', () => {
  it('includes arrow, method, URL, headers, and body', () => {
    const out = formatRequestHTTP(
      makeConfig({
        method: 'POST',
        url: '/experiments',
        data: { name: 'my-exp' },
      }),
      NO_COLOR
    );
    expect(out).toContain('→ POST https://api.example.com/v1/experiments');
    expect(out).toContain('Content-Type: application/json');
    expect(out).toContain('Authorization: Api-Key ***');
    expect(out).toContain('"name": "my-exp"');
  });

  it('folds params into the URL as a query string', () => {
    const out = formatRequestHTTP(
      makeConfig({ url: '/experiments', params: { expand: 'metrics', state: 'running' } }),
      NO_COLOR
    );
    expect(out).toMatch(/\/experiments\?expand=metrics&state=running/);
  });

  it('appends params with & when URL already has a query string', () => {
    const out = formatRequestHTTP(
      makeConfig({ url: '/experiments?foo=1', params: { bar: 2 } }),
      NO_COLOR
    );
    expect(out).toMatch(/\/experiments\?foo=1&bar=2/);
  });

  it('expands array params as repeated keys', () => {
    const out = formatRequestHTTP(
      makeConfig({ url: '/experiments', params: { tag: ['a', 'b'] } }),
      NO_COLOR
    );
    expect(out).toMatch(/tag=a&tag=b/);
  });

  it('omits the body section when there is no body', () => {
    const out = formatRequestHTTP(makeConfig({ method: 'GET' }), NO_COLOR);
    expect(out).not.toContain('\n\n');
  });

  it('pretty-prints JSON bodies with 2-space indent', () => {
    const out = formatRequestHTTP(
      makeConfig({
        method: 'POST',
        data: { name: 'x', nested: { id: 1 } },
      }),
      NO_COLOR
    );
    expect(out).toContain('  {\n    "name": "x",\n    "nested": {\n      "id": 1\n    }\n  }');
  });

  it('with color: false produces no ANSI escape codes', () => {
    const out = formatRequestHTTP(makeConfig({ method: 'POST', data: { foo: 'bar' } }), NO_COLOR);
    expect(out).not.toMatch(ANSI_RE);
  });

  it('with color: true includes ANSI codes', () => {
    const out = formatRequestHTTP(makeConfig({ method: 'POST', data: { foo: 'bar' } }), WITH_COLOR);
    expect(out).toMatch(ANSI_RE);
  });

  it('with showSecrets: true reveals the full Authorization header', () => {
    const out = formatRequestHTTP(makeConfig(), WITH_SECRETS);
    expect(out).toContain('Authorization: Api-Key secret-key-123');
  });

  it('builds a URL when only baseURL is set', () => {
    const out = formatRequestHTTP(
      makeConfig({ baseURL: 'https://api.example.com', url: '' }),
      NO_COLOR
    );
    expect(out).toContain('→ GET https://api.example.com');
  });

  it('uses absolute url verbatim when one is supplied', () => {
    const out = formatRequestHTTP(
      makeConfig({ baseURL: 'https://api.example.com', url: 'https://other.example.com/path' }),
      NO_COLOR
    );
    expect(out).toContain('→ GET https://other.example.com/path');
  });
});

describe('formatRequestCurl', () => {
  it('emits a valid curl command', () => {
    const out = formatRequestCurl(
      makeConfig({ method: 'POST', url: '/experiments', data: { name: 'x' } }),
      NO_COLOR
    );
    expect(out.startsWith('$ curl -X POST')).toBe(true);
    expect(out).toContain(`'https://api.example.com/v1/experiments'`);
    expect(out).toContain(`-H 'Content-Type: application/json'`);
    expect(out).toContain(`-H 'Authorization: Api-Key ***'`);
    expect(out).toContain(`-d '{"name":"x"}'`);
  });

  it("escapes single quotes in body as '\\''", () => {
    const out = formatRequestCurl(
      makeConfig({ method: 'POST', data: { msg: "it's working" } }),
      NO_COLOR
    );
    expect(out).toContain(`-d '{"msg":"it'\\''s working"}'`);
  });

  it('omits the -d flag when there is no body', () => {
    const out = formatRequestCurl(makeConfig({ method: 'GET' }), NO_COLOR);
    expect(out).not.toContain(`-d `);
  });

  it('with color: false produces no ANSI escape codes', () => {
    const out = formatRequestCurl(makeConfig({ method: 'POST', data: { foo: 'bar' } }), NO_COLOR);
    expect(out).not.toMatch(ANSI_RE);
  });

  it('redacts Authorization by default', () => {
    const out = formatRequestCurl(makeConfig(), NO_COLOR);
    expect(out).toContain(`Authorization: Api-Key ***`);
    expect(out).not.toContain('secret-key-123');
  });
});

describe('formatResponseHTTP', () => {
  it('includes status, status text, elapsed, headers, and body', () => {
    const out = formatResponseHTTP(
      makeResponse({
        status: 201,
        statusText: 'Created',
        headers: { 'Content-Type': 'application/json' },
        data: { id: 42 },
      }),
      150,
      NO_COLOR
    );
    expect(out).toContain('← 201 Created (150ms)');
    expect(out).toContain('Content-Type: application/json');
    expect(out).toContain('"id": 42');
  });

  it('colors 2xx status green', () => {
    const out = formatResponseHTTP(makeResponse({ status: 200, statusText: 'OK' }), 10, WITH_COLOR);
    expect(out).toContain('\x1b[32m');
  });

  it('colors 3xx status yellow', () => {
    const out = formatResponseHTTP(
      makeResponse({ status: 301, statusText: 'Moved Permanently' }),
      10,
      WITH_COLOR
    );
    expect(out).toContain('\x1b[33m');
  });

  it('colors 4xx status red', () => {
    const out = formatResponseHTTP(
      makeResponse({ status: 404, statusText: 'Not Found' }),
      10,
      WITH_COLOR
    );
    expect(out).toContain('\x1b[31m');
  });

  it('colors 5xx status bold red', () => {
    const out = formatResponseHTTP(
      makeResponse({ status: 500, statusText: 'Internal Server Error' }),
      10,
      WITH_COLOR
    );
    expect(out).toMatch(/\x1b\[1m.*\x1b\[31m|\x1b\[31m.*\x1b\[1m/);
  });

  it('omits body section when response has no body', () => {
    const out = formatResponseHTTP(
      makeResponse({ status: 204, statusText: 'No Content', data: undefined }),
      10,
      NO_COLOR
    );
    expect(out).not.toContain('\n\n');
  });

  it('handles non-JSON bodies as raw text', () => {
    const out = formatResponseHTTP(
      makeResponse({
        headers: { 'Content-Type': 'text/plain' },
        data: 'hello world',
      }),
      10,
      NO_COLOR
    );
    expect(out).toContain('hello world');
  });
});

describe('formatNetworkError', () => {
  it('prints the error message and elapsed time', () => {
    const err = { message: 'connect ECONNREFUSED 127.0.0.1:8080' } as AxiosError;
    const out = formatNetworkError(err, 50, NO_COLOR);
    expect(out).toBe('← connect ECONNREFUSED 127.0.0.1:8080 (50ms)');
  });

  it('falls back to error.code when message is missing', () => {
    const err = { code: 'ETIMEDOUT', message: '' } as AxiosError;
    const out = formatNetworkError(err, 100, NO_COLOR);
    expect(out).toContain('ETIMEDOUT');
  });

  it('falls back to "network error" when neither is present', () => {
    const err = { message: '' } as AxiosError;
    const out = formatNetworkError(err, 0, NO_COLOR);
    expect(out).toContain('network error');
  });
});
