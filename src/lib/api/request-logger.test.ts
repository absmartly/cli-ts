import { describe, it, expect } from 'vitest';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { AxiosHeaders } from 'axios';
import {
  redactHeaders,
  redactBody,
  formatRequestHTTP,
  formatRequestCurl,
  formatResponseHTTP,
  formatNetworkError,
  formatGenericError,
  type FormatOptions,
} from './request-logger.js';

const NO_COLOR: FormatOptions = { showSecrets: false, color: false };
const WITH_COLOR: FormatOptions = { showSecrets: false, color: true };
const WITH_SECRETS: FormatOptions = { showSecrets: true, color: false };

const ANSI_RE = /\x1b\[[0-9;]*m/;
const ANSI_GLOBAL_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI_GLOBAL_RE, '');

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

  it('fully redacts Cookie / Set-Cookie / X-Api-Key (no scheme to preserve)', () => {
    const out = redactHeaders(
      {
        Cookie: 'session=abc; Path=/',
        'Set-Cookie': 'token=xyz; HttpOnly',
        'X-Api-Key': 'raw-key-no-prefix',
      },
      false
    );
    expect(out.Cookie).toBe('***');
    expect(out['Set-Cookie']).toBe('***');
    expect(out['X-Api-Key']).toBe('***');
  });

  it('redacts Proxy-Authorization with scheme preservation', () => {
    const out = redactHeaders({ 'Proxy-Authorization': 'Basic dXNlcjpwYXNz' }, false);
    expect(out['Proxy-Authorization']).toBe('Basic ***');
  });

  it('redacts a non-string sensitive header to plain ***', () => {
    const out = redactHeaders(
      { Authorization: 12345 as unknown as string, 'Set-Cookie': null as unknown as string },
      false
    );
    expect(out.Authorization).toBe('***');
    expect(out['Set-Cookie']).toBe('***');
  });
});

describe('redactBody', () => {
  it('replaces top-level sensitive string fields with ***', () => {
    const out = redactBody({ key: 'abc', name: 'frontend' }, false);
    expect(out).toEqual({ key: '***', name: 'frontend' });
  });

  it('matches sensitive field names case-insensitively', () => {
    const out = redactBody({ Password: 'secret', API_KEY: 'k', Token: 't' }, false);
    expect(out).toEqual({ Password: '***', API_KEY: '***', Token: '***' });
  });

  it('walks nested objects', () => {
    const out = redactBody({ user: { id: 1, password: 'x' }, meta: { token: 'y' } }, false);
    expect(out).toEqual({ user: { id: 1, password: '***' }, meta: { token: '***' } });
  });

  it('walks arrays of objects', () => {
    const out = redactBody(
      { keys: [{ name: 'a', key: 'k1' }, { name: 'b', key: 'k2' }] },
      false
    );
    expect(out).toEqual({
      keys: [
        { name: 'a', key: '***' },
        { name: 'b', key: '***' },
      ],
    });
  });

  it('preserves null and non-string values for sensitive keys (no spurious ***)', () => {
    const out = redactBody({ token: null, key: 0, secret: false }, false);
    expect(out).toEqual({ token: null, key: 0, secret: false });
  });

  it('with showSecrets: true returns the input unchanged', () => {
    const input = { password: 'plaintext', nested: { key: 'k' } };
    expect(redactBody(input, true)).toBe(input);
  });

  it('passes through primitive top-level values', () => {
    expect(redactBody('hello', false)).toBe('hello');
    expect(redactBody(42, false)).toBe(42);
    expect(redactBody(null, false)).toBe(null);
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

  it('uses AxiosHeaders.toJSON() when headers is an AxiosHeaders instance', () => {
    const headers = new AxiosHeaders();
    headers.set('Authorization', 'Api-Key real-key-value');
    headers.set('Content-Type', 'application/json');
    const config = makeConfig({ headers, data: { id: 1 } });
    const out = formatRequestHTTP(config, NO_COLOR);
    expect(out).toContain('Authorization: Api-Key ***');
    expect(out).toContain('Content-Type: application/json');
    expect(out).not.toContain('real-key-value');
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

  it('escapes single quotes in URL and header values for paste-safety', () => {
    const out = formatRequestCurl(
      makeConfig({
        url: "/items?name=o'reilly",
        headers: {
          'Content-Type': 'application/json',
          'X-Note': "user's note",
        },
      }),
      NO_COLOR
    );
    expect(out).toContain(`/items?name=o'\\''reilly`);
    expect(out).toContain(`'X-Note: user'\\''s note'`);
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

  it('redacts sensitive body fields by default', () => {
    const out = formatRequestCurl(
      makeConfig({ method: 'POST', data: { username: 'u', password: 'plaintext' } }),
      NO_COLOR
    );
    expect(out).toContain(`-d '{"username":"u","password":"***"}'`);
    expect(out).not.toContain('plaintext');
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

  it('colors 2xx status (visible text + ANSI present, distinct from 4xx coloring)', () => {
    const ok = formatResponseHTTP(makeResponse({ status: 200, statusText: 'OK' }), 10, WITH_COLOR);
    const notFound = formatResponseHTTP(
      makeResponse({ status: 404, statusText: 'Not Found' }),
      10,
      WITH_COLOR
    );
    expect(stripAnsi(ok)).toContain('200 OK');
    expect(ok).toMatch(ANSI_RE);
    // Different status bands should produce different colored output.
    expect(ok.match(ANSI_GLOBAL_RE)?.join('')).not.toBe(notFound.match(ANSI_GLOBAL_RE)?.join(''));
  });

  it('colors 3xx status', () => {
    const out = formatResponseHTTP(
      makeResponse({ status: 301, statusText: 'Moved Permanently' }),
      10,
      WITH_COLOR
    );
    expect(stripAnsi(out)).toContain('301 Moved Permanently');
    expect(out).toMatch(ANSI_RE);
  });

  it('colors 4xx status', () => {
    const out = formatResponseHTTP(
      makeResponse({ status: 404, statusText: 'Not Found' }),
      10,
      WITH_COLOR
    );
    expect(stripAnsi(out)).toContain('404 Not Found');
    expect(out).toMatch(ANSI_RE);
  });

  it('colors 5xx status (bold red — visible text + ANSI present)', () => {
    const out = formatResponseHTTP(
      makeResponse({ status: 500, statusText: 'Internal Server Error' }),
      10,
      WITH_COLOR
    );
    expect(stripAnsi(out)).toContain('500 Internal Server Error');
    expect(out).toMatch(ANSI_RE);
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

  it('marks malformed JSON bodies so the user knows parsing failed', () => {
    const out = formatResponseHTTP(
      makeResponse({
        headers: { 'Content-Type': 'application/json' },
        data: '{"oops": broken',
      }),
      10,
      NO_COLOR
    );
    expect(out).toContain('// (invalid JSON, showing raw body)');
    expect(out).toContain('{"oops": broken');
  });

  it('redacts sensitive response headers (Set-Cookie, Authorization echo)', () => {
    const out = formatResponseHTTP(
      makeResponse({
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=abc; HttpOnly',
          Authorization: 'Bearer echoed-token',
        },
        data: {},
      }),
      10,
      NO_COLOR
    );
    expect(out).toContain('Set-Cookie: ***');
    expect(out).toContain('Authorization: Bearer ***');
    expect(out).not.toContain('session=abc');
    expect(out).not.toContain('echoed-token');
  });

  it('redacts secret fields in response bodies (api key creation)', () => {
    const out = formatResponseHTTP(
      makeResponse({
        status: 201,
        statusText: 'Created',
        data: { id: 7, name: 'frontend', key: 'newly-minted-secret-key' },
      }),
      10,
      NO_COLOR
    );
    expect(out).toContain('"key": "***"');
    expect(out).not.toContain('newly-minted-secret-key');
  });

  it('redacts secret fields in nested response structures', () => {
    const out = formatResponseHTTP(
      makeResponse({
        data: { user: { id: 1, password: 'reset-pw' }, meta: { token: 'jwt-here' } },
      }),
      10,
      NO_COLOR
    );
    expect(out).not.toContain('reset-pw');
    expect(out).not.toContain('jwt-here');
    expect(out).toContain('"password": "***"');
    expect(out).toContain('"token": "***"');
  });

  it('does not redact response headers or body when showSecrets is true', () => {
    const out = formatResponseHTTP(
      makeResponse({
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'session=abc' },
        data: { key: 'visible-key' },
      }),
      10,
      WITH_SECRETS
    );
    expect(out).toContain('Set-Cookie: session=abc');
    expect(out).toContain('"key": "visible-key"');
  });

  it('joins multi-value headers (Set-Cookie array) into a single line', () => {
    const out = formatResponseHTTP(
      makeResponse({
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': ['session=abc; HttpOnly', 'refresh=xyz; HttpOnly'] as unknown as string,
        },
      }),
      10,
      WITH_SECRETS
    );
    expect(out).toContain('Set-Cookie: session=abc; HttpOnly, refresh=xyz; HttpOnly');
  });

  it('redacts a multi-value sensitive header to *** without leaking values', () => {
    const out = formatResponseHTTP(
      makeResponse({
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': ['session=abc; HttpOnly', 'refresh=xyz'] as unknown as string,
        },
      }),
      10,
      NO_COLOR
    );
    expect(out).toContain('Set-Cookie: ***');
    expect(out).not.toContain('session=abc');
    expect(out).not.toContain('refresh=xyz');
  });

  it('marks unprintable header values rather than dropping them silently', () => {
    const out = formatResponseHTTP(
      makeResponse({
        headers: {
          'Content-Type': 'application/json',
          'X-Weird': { nested: 'object' } as unknown as string,
        },
      }),
      10,
      NO_COLOR
    );
    expect(out).toContain('X-Weird: [unprintable: object]');
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

describe('formatGenericError', () => {
  it('prefixes a non-HTTP marker so the user knows it is not a response', () => {
    const out = formatGenericError(new Error('upstream interceptor blew up'), 0, NO_COLOR);
    expect(out).toContain('(non-HTTP error)');
    expect(out).toContain('upstream interceptor blew up');
    expect(out.startsWith('←')).toBe(true);
  });

  it('coerces non-Error throws to string', () => {
    const out = formatGenericError({ weird: true }, 0, NO_COLOR);
    expect(out).toContain('[object Object]');
  });
});
