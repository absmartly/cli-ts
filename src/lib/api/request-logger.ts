import { Chalk } from 'chalk';
import { highlight, type Theme } from 'cli-highlight';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Forced Chalk instance: always emit ANSI codes when called. Lets the caller
// gate coloring with a single boolean (typically process.stderr.isTTY) and
// keeps tests independent of chalk's own TTY heuristics.
const c = new Chalk({ level: 1 });

const JSON_THEME: Theme = {
  attr: c.cyan,
  string: c.green,
  number: c.yellow,
  literal: c.magenta,
};

export interface FormatOptions {
  showSecrets: boolean;
  color: boolean;
}

const REDACTED = '***';
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
]);

// Body field names that commonly carry secrets in ABSmartly API request/response
// payloads (api keys, password reset, OAuth login, etc.). Match is case-insensitive
// on the key; values are replaced with '***' when showSecrets is false.
const SENSITIVE_BODY_FIELDS = new Set([
  'key',
  'password',
  'token',
  'secret',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
]);

// Headers redacted to keep their scheme prefix (e.g. "Api-Key ***", "Bearer ***").
const SCHEMED_AUTH_HEADERS = new Set(['authorization', 'proxy-authorization']);

export function redactHeaders(
  headers: Record<string, string>,
  showSecrets: boolean
): Record<string, string> {
  if (showSecrets) return { ...headers };
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (!SENSITIVE_HEADERS.has(lower)) {
      out[key] = value;
      continue;
    }
    if (typeof value !== 'string') {
      out[key] = REDACTED;
      continue;
    }
    if (SCHEMED_AUTH_HEADERS.has(lower)) {
      const space = value.indexOf(' ');
      out[key] = space > 0 ? `${value.slice(0, space)} ${REDACTED}` : REDACTED;
    } else {
      out[key] = REDACTED;
    }
  }
  return out;
}

export function redactBody(data: unknown, showSecrets: boolean): unknown {
  if (showSecrets || data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((item) => redactBody(item, showSecrets));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_BODY_FIELDS.has(k.toLowerCase()) && typeof v === 'string' && v !== '') {
      out[k] = REDACTED;
    } else {
      out[k] = redactBody(v, showSecrets);
    }
  }
  return out;
}

const METHOD_COLORS: Record<string, (s: string) => string> = {
  GET: (s) => c.bold.green(s),
  POST: (s) => c.bold.yellow(s),
  PUT: (s) => c.bold.blue(s),
  DELETE: (s) => c.bold.red(s),
  PATCH: (s) => c.bold.magenta(s),
};

function colorMethod(method: string, color: boolean): string {
  if (!color) return method;
  return (METHOD_COLORS[method] ?? c.bold)(method);
}

function colorStatus(status: number, statusText: string, color: boolean): string {
  const text = statusText ? `${status} ${statusText}` : String(status);
  if (!color) return text;
  if (status >= 500) return c.bold.red(text);
  if (status >= 400) return c.red(text);
  if (status >= 300) return c.yellow(text);
  if (status >= 200) return c.green(text);
  return text;
}

function colorHeaderName(name: string, color: boolean): string {
  return color ? c.cyan(name) : name;
}

function buildUrl(config: InternalAxiosRequestConfig): string {
  const base = config.baseURL ?? '';
  const url = config.url ?? '';
  let full: string;
  if (!url) {
    full = base;
  } else if (/^https?:\/\//i.test(url)) {
    full = url;
  } else if (base) {
    full = `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  } else {
    full = url;
  }

  if (config.params && typeof config.params === 'object') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(config.params as Record<string, unknown>)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) qs.append(k, String(item));
      } else {
        qs.append(k, String(v));
      }
    }
    const qStr = qs.toString();
    if (qStr) full += (full.includes('?') ? '&' : '?') + qStr;
  }
  return full;
}

function extractHeaders(source: { headers?: unknown }): Record<string, string> {
  const headers = source.headers;
  const out: Record<string, string> = {};
  if (!headers) return out;
  const obj =
    typeof (headers as { toJSON?: () => unknown }).toJSON === 'function'
      ? ((headers as { toJSON: () => Record<string, unknown> }).toJSON() as Record<string, unknown>)
      : (headers as Record<string, unknown>);
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
    else if (Array.isArray(v)) out[k] = v.map((item) => String(item)).join(', ');
    else if (v !== null && v !== undefined) out[k] = `[unprintable: ${typeof v}]`;
  }
  return out;
}

function getContentType(headers: Record<string, string>): string {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'content-type') return v;
  }
  return '';
}

function formatJsonBody(data: unknown, color: boolean): string {
  let json: string;
  if (typeof data === 'string') {
    try {
      json = JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      const tag = color
        ? c.dim('// (invalid JSON, showing raw body)')
        : '// (invalid JSON, showing raw body)';
      return `${tag}\n${data}`;
    }
  } else {
    json = JSON.stringify(data, null, 2);
  }
  return color
    ? highlight(json, { language: 'json', ignoreIllegals: true, theme: JSON_THEME })
    : json;
}

function formatBodyHTTP(data: unknown, contentType: string, opts: FormatOptions): string {
  if (data === undefined || data === null || data === '') return '';
  const redacted = redactBody(data, opts.showSecrets);
  if (contentType.toLowerCase().includes('application/json')) {
    return formatJsonBody(redacted, opts.color);
  }
  return typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
}

function indent(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
}

export function formatRequestHTTP(config: InternalAxiosRequestConfig, opts: FormatOptions): string {
  const method = (config.method ?? 'GET').toUpperCase();
  const url = buildUrl(config);
  const arrow = opts.color ? c.bold.cyan('→') : '→';
  const renderedUrl = opts.color ? c.dim(url) : url;
  const lines: string[] = [`${arrow} ${colorMethod(method, opts.color)} ${renderedUrl}`];

  const headers = redactHeaders(extractHeaders(config), opts.showSecrets);
  for (const [k, v] of Object.entries(headers)) {
    lines.push(`  ${colorHeaderName(k, opts.color)}: ${v}`);
  }

  const body = formatBodyHTTP(config.data, getContentType(headers), opts);
  if (body) {
    lines.push('');
    lines.push(indent(body, '  '));
  }
  return lines.join('\n');
}

export function formatRequestCurl(config: InternalAxiosRequestConfig, opts: FormatOptions): string {
  const method = (config.method ?? 'GET').toUpperCase();
  const url = buildUrl(config);
  const headers = redactHeaders(extractHeaders(config), opts.showSecrets);
  const headerEntries = Object.entries(headers);
  const hasBody = config.data !== undefined && config.data !== null && config.data !== '';

  const dollar = opts.color ? c.dim('$') : '$';
  const flag = (s: string) => (opts.color ? c.cyan(s) : s);
  const lines: string[] = [];

  const firstTrailing = headerEntries.length > 0 || hasBody ? ' \\' : '';
  lines.push(`${dollar} curl ${flag('-X')} ${method} '${url}'${firstTrailing}`);

  for (let i = 0; i < headerEntries.length; i++) {
    const [k, v] = headerEntries[i]!;
    const isLastHeader = i === headerEntries.length - 1;
    const trailing = !isLastHeader || hasBody ? ' \\' : '';
    lines.push(`  ${flag('-H')} '${k}: ${v}'${trailing}`);
  }

  if (hasBody) {
    const redacted = redactBody(config.data, opts.showSecrets);
    let body = typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
    body = body.replace(/'/g, `'\\''`);
    lines.push(`  ${flag('-d')} '${body}'`);
  }

  return lines.join('\n');
}

export function formatResponseHTTP(
  response: AxiosResponse,
  elapsedMs: number,
  opts: FormatOptions
): string {
  const isError = response.status >= 400;
  const arrowColor = isError ? c.bold.red : c.bold.green;
  const arrow = opts.color ? arrowColor('←') : '←';
  const status = colorStatus(response.status, response.statusText || '', opts.color);
  const elapsed = opts.color ? c.dim(`(${elapsedMs}ms)`) : `(${elapsedMs}ms)`;
  const lines: string[] = [`${arrow} ${status} ${elapsed}`];

  const headers = redactHeaders(extractHeaders(response), opts.showSecrets);
  for (const [k, v] of Object.entries(headers)) {
    lines.push(`  ${colorHeaderName(k, opts.color)}: ${v}`);
  }

  const body = formatBodyHTTP(response.data, getContentType(headers), opts);
  if (body) {
    lines.push('');
    lines.push(indent(body, '  '));
  }
  return lines.join('\n');
}

export function formatNetworkError(
  error: AxiosError,
  elapsedMs: number,
  opts: FormatOptions
): string {
  const arrow = opts.color ? c.bold.red('←') : '←';
  const msg = error.message || error.code || 'network error';
  const elapsed = opts.color ? c.dim(`(${elapsedMs}ms)`) : `(${elapsedMs}ms)`;
  return `${arrow} ${msg} ${elapsed}`;
}

export function formatGenericError(
  error: unknown,
  elapsedMs: number,
  opts: FormatOptions
): string {
  const arrow = opts.color ? c.bold.red('←') : '←';
  const msg = error instanceof Error ? error.message : String(error);
  const tag = opts.color ? c.dim('(non-HTTP error)') : '(non-HTTP error)';
  const elapsed = opts.color ? c.dim(`(${elapsedMs}ms)`) : `(${elapsedMs}ms)`;
  return `${arrow} ${tag} ${msg} ${elapsed}`;
}
