import { Chalk } from 'chalk';
import { highlight, type Theme } from 'cli-highlight';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// level: 1 forces ANSI on; coloring is gated per-call via opts.color.
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
  // Suppresses the body section in HTTP-block output and the -d flag in
  // curl output. Useful when responses are huge but the user only cares
  // about status + headers.
  omitBody?: boolean;
  // For responses only: emit only the "← STATUS TEXT (Nms)" line, no
  // headers, no body. Strict superset of omitBody.
  statusOnly?: boolean;
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

// Query-string parameter names that frequently carry presigned credentials
// (AWS / GCP / Azure / generic). Matched case-insensitively. When any of these
// appear we replace the *entire* query string — not just the matched keys —
// since the surrounding params (Expires, Policy, etc.) are also part of the
// signed bundle and a partial reveal can still attribute the URL.
const SENSITIVE_QUERY_PARAMS = new Set([
  'signature',
  'x-amz-signature',
  'x-amz-credential',
  'x-amz-security-token',
  'x-amz-algorithm',
  'x-amz-date',
  'x-amz-expires',
  'x-amz-signedheaders',
  'x-goog-signature',
  'x-goog-credential',
  'x-goog-algorithm',
  'x-goog-date',
  'x-goog-expires',
  'x-goog-signedheaders',
  'sig',
  'token',
  'auth',
  'access_token',
]);

const PRESIGNED_REDACTED_QS = '?[redacted-presigned]';
const REDIRECT_HEADERS = new Set(['location', 'content-location']);

export function redactUrl(url: string, showSecrets: boolean): string {
  if (showSecrets) return url;
  const qIdx = url.indexOf('?');
  if (qIdx < 0) return url;
  const qs = url.slice(qIdx + 1);
  const hashIdx = qs.indexOf('#');
  const params = (hashIdx >= 0 ? qs.slice(0, hashIdx) : qs).split('&');
  const trailing = hashIdx >= 0 ? qs.slice(hashIdx) : '';
  for (const p of params) {
    const eq = p.indexOf('=');
    const name = (eq >= 0 ? p.slice(0, eq) : p).toLowerCase();
    if (SENSITIVE_QUERY_PARAMS.has(name)) {
      return url.slice(0, qIdx) + PRESIGNED_REDACTED_QS + trailing;
    }
  }
  return url;
}

export function redactHeaders(
  headers: Record<string, string>,
  showSecrets: boolean
): Record<string, string> {
  if (showSecrets) return { ...headers };
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (REDIRECT_HEADERS.has(lower) && typeof value === 'string') {
      out[key] = redactUrl(value, false);
      continue;
    }
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
  if (showSecrets) return data;
  return redactBodyInner(data, new WeakSet());
}

function redactBodyInner(data: unknown, visited: WeakSet<object>): unknown {
  if (data === null || typeof data !== 'object') return data;
  if (visited.has(data as object)) return '[circular]';
  visited.add(data as object);
  if (Array.isArray(data)) return data.map((item) => redactBodyInner(item, visited));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    // Sensitive keys redact regardless of value type so an object/array under
    // `token` etc. cannot leak its children. Even null/0/false are masked —
    // the key being present is itself a signal worth concealing.
    if (SENSITIVE_BODY_FIELDS.has(k.toLowerCase())) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = redactBodyInner(v, visited);
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
    json = safeStringify(data, 2);
  }
  return color
    ? highlight(json, { language: 'json', ignoreIllegals: true, theme: JSON_THEME })
    : json;
}

function formatBodyHTTP(data: unknown, contentType: string, opts: FormatOptions): string {
  if (opts.omitBody) return '';
  if (data === undefined || data === null || data === '') return '';
  const redacted = redactBody(data, opts.showSecrets);
  if (contentType.toLowerCase().includes('application/json')) {
    return formatJsonBody(redacted, opts.color);
  }
  return typeof redacted === 'string' ? redacted : safeStringify(redacted);
}

function indent(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
}

// Wraps JSON.stringify so logging never throws into the request path. Circular
// references (and any other Errors from stringify) become a fixed placeholder.
export function safeStringify(value: unknown, indentSpaces?: number): string {
  try {
    return JSON.stringify(value, null, indentSpaces);
  } catch {
    return '"[unserialisable]"';
  }
}

export function formatRequestHTTP(config: InternalAxiosRequestConfig, opts: FormatOptions): string {
  const method = (config.method ?? 'GET').toUpperCase();
  const url = redactUrl(buildUrl(config), opts.showSecrets);
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
  const url = redactUrl(buildUrl(config), opts.showSecrets);
  const headers = redactHeaders(extractHeaders(config), opts.showSecrets);
  const headerEntries = Object.entries(headers);
  const hasBody =
    !opts.omitBody && config.data !== undefined && config.data !== null && config.data !== '';

  const dollar = opts.color ? c.dim('$') : '$';
  const flag = (s: string) => (opts.color ? c.cyan(s) : s);
  const shellEscape = (s: string) => s.replace(/'/g, `'\\''`);
  const lines: string[] = [];

  const firstTrailing = headerEntries.length > 0 || hasBody ? ' \\' : '';
  lines.push(`${dollar} curl ${flag('-X')} ${method} '${shellEscape(url)}'${firstTrailing}`);

  for (let i = 0; i < headerEntries.length; i++) {
    const [k, v] = headerEntries[i]!;
    const isLastHeader = i === headerEntries.length - 1;
    const trailing = !isLastHeader || hasBody ? ' \\' : '';
    lines.push(`  ${flag('-H')} '${shellEscape(`${k}: ${v}`)}'${trailing}`);
  }

  if (hasBody) {
    const redacted = redactBody(config.data, opts.showSecrets);
    const body = typeof redacted === 'string' ? redacted : safeStringify(redacted);
    lines.push(`  ${flag('-d')} '${shellEscape(body)}'`);
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
  const statusLine = `${arrow} ${status} ${elapsed}`;

  if (opts.statusOnly) return statusLine;

  const lines: string[] = [statusLine];
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

export function formatGenericError(error: unknown, elapsedMs: number, opts: FormatOptions): string {
  const arrow = opts.color ? c.bold.red('←') : '←';
  const msg = error instanceof Error ? error.message : String(error);
  const tag = opts.color ? c.dim('(non-HTTP error)') : '(non-HTTP error)';
  const elapsed = opts.color ? c.dim(`(${elapsedMs}ms)`) : `(${elapsedMs}ms)`;
  return `${arrow} ${tag} ${msg} ${elapsed}`;
}

export function formatSuppressionNotice(count: number, color: boolean): string {
  const word = count === 1 ? 'request' : 'requests';
  const text = `(${count} identical ${word} suppressed)`;
  return color ? `  ${c.dim(text)}` : `  ${text}`;
}
