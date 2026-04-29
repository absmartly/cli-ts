import { createAPIClient, APIClient } from '../api/client.js';
import { getProfile, loadConfig } from '../config/config.js';
import { getAPIKey, getOAuthToken } from '../config/keyring.js';
import type { AuthConfig } from '../api/axios-adapter.js';
import { Command } from 'commander';
import { formatOutput, type OutputFormat } from '../output/formatter.js';

export async function resolveAPIKey(options: GlobalOptions): Promise<string> {
  const config = loadConfig();
  const profileName = options.profile || config['default-profile'];
  const apiKey = options.apiKey || process.env.ABSMARTLY_API_KEY || (await getAPIKey(profileName));

  if (!apiKey) {
    throw new Error(
      `No API key found for profile "${profileName}".\n` +
        `Run: abs setup\n` +
        `Or:  abs --endpoint https://your-api.example.com/v1 --api-key YOUR_KEY <command>`
    );
  }

  return apiKey;
}

export function resolveEndpoint(options: GlobalOptions): string {
  const config = loadConfig();
  const profileName = options.profile || config['default-profile'];
  const profile = getProfile(profileName);
  return options.endpoint || process.env.ABSMARTLY_API_ENDPOINT || profile.api.endpoint;
}

export async function resolveAuth(options: GlobalOptions): Promise<AuthConfig> {
  if (options.apiKey) {
    return { method: 'api-key', apiKey: options.apiKey };
  }

  const envKey = process.env.ABSMARTLY_API_KEY;
  if (envKey) {
    return { method: 'api-key', apiKey: envKey };
  }

  const config = loadConfig();
  const profileName = options.profile || config['default-profile'];
  const profile = getProfile(profileName);
  const authMethod = profile.api['auth-method'] ?? 'api-key';

  if (authMethod === 'oauth-jwt') {
    const token = await getOAuthToken(profileName);
    if (!token) {
      throw new Error(
        `No OAuth token found for profile "${profileName}".\n` + `Run: abs auth login`
      );
    }
    return { method: 'oauth-jwt', token };
  }

  const apiKey = await getAPIKey(profileName);
  if (!apiKey) {
    throw new Error(
      `No API key found for profile "${profileName}".\n` +
        `Run: abs auth login\n` +
        `Or:  abs --endpoint https://your-api.example.com/v1 --api-key YOUR_KEY <command>`
    );
  }
  return { method: 'api-key', apiKey };
}

export async function getAPIClientFromOptions(options: GlobalOptions): Promise<APIClient> {
  const config = loadConfig();
  const profileName = options.profile || config['default-profile'];
  const profile = getProfile(profileName);
  const endpoint = options.endpoint || process.env.ABSMARTLY_API_ENDPOINT || profile.api.endpoint;

  if (!endpoint) {
    throw new Error(
      `No API endpoint configured for profile "${profileName}".\n` +
        `Run: abs auth login\n` +
        `Or:  abs --endpoint https://your-api.example.com/v1 --api-key YOUR_KEY <command>`
    );
  }

  const auth = await resolveAuth(options);
  return createAPIClient(endpoint, auth, {
    verbose: options.verbose ?? false,
    insecure: profile.api.insecure ?? false,
    showRequest: options.showRequest ?? false,
    showResponse: options.showResponse ?? false,
    curl: options.curl ?? false,
    showSecrets: options.showSecrets ?? false,
    headersOnly: options.headersOnly ?? false,
    statusOnly: options.statusOnly ?? false,
    // Pass user-intent only (--no-color or NO_COLOR), not the stdout-TTY
    // conflated value: stderr diagnostics make their own TTY decision.
    noColor: options.colorDisabled ?? false,
  });
}

export interface GlobalOptions {
  config?: string;
  apiKey?: string;
  endpoint?: string;
  app?: string;
  env?: string;
  output?: OutputFormat;
  noColor?: boolean;
  // True when the user explicitly disabled color (--no-color or NO_COLOR env).
  // noColor above additionally disables when stdout isn't a TTY; this field
  // is the strict user-intent variant for stderr-bound consumers.
  colorDisabled?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  profile?: string;
  terse?: boolean;
  full?: boolean;
  raw?: boolean;
  showRequest?: boolean;
  showResponse?: boolean;
  curl?: boolean;
  showSecrets?: boolean;
  headersOnly?: boolean;
  statusOnly?: boolean;
}

const VALID_FORMATS: OutputFormat[] = [
  'table',
  'json',
  'yaml',
  'plain',
  'markdown',
  'rendered',
  'template',
  'vertical',
  'ids',
];

export function getGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  const output = (opts.output || 'table') as OutputFormat;

  if (!VALID_FORMATS.includes(output)) {
    throw new Error(
      `Invalid output format: '${output}'. Must be one of: ${VALID_FORMATS.join(', ')}`
    );
  }

  const colorDisabled = opts.color === false || !!process.env.NO_COLOR;
  // --status-only is response-only by definition; auto-enable --show-response
  // so the user doesn't have to type both.
  const statusOnly = opts.statusOnly || false;
  const showResponse = opts.showResponse || statusOnly || false;

  return {
    config: opts.config,
    apiKey: opts.apiKey,
    endpoint: opts.endpoint,
    app: opts.app,
    env: opts.env,
    output,
    noColor: colorDisabled || !process.stdout.isTTY,
    colorDisabled,
    verbose: opts.verbose || false,
    quiet: opts.quiet || false,
    profile: opts.profile,
    terse: opts.terse || false,
    full: opts.full || false,
    raw: opts.raw || false,
    showRequest: opts.showRequest || false,
    showResponse,
    curl: opts.curl || false,
    showSecrets: opts.showSecrets || false,
    headersOnly: opts.headersOnly || false,
    statusOnly,
  };
}

export function printFormatted(data: unknown, globalOptions: GlobalOptions): void {
  const output = formatOutput(data, globalOptions.output, {
    noColor: globalOptions.noColor ?? false,
    full: globalOptions.full ?? false,
    terse: globalOptions.terse ?? false,
  });
  console.log(output);
}

function handleCommandError(error: unknown): never {
  console.error('Error:', error instanceof Error ? error.message : error);
  const apiError = error as { statusCode?: number; response?: unknown };
  if (apiError.response && typeof apiError.response === 'object') {
    const resp = apiError.response as Record<string, unknown>;
    if (resp.errors && Array.isArray(resp.errors) && resp.errors.length > 0) {
      for (const e of resp.errors) console.error(' ', e);
    }
  }
  process.exit(1);
}

export function withErrorHandling<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<void>
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs) => {
    try {
      await fn(...args);
    } catch (error) {
      handleCommandError(error);
    }
  };
}
