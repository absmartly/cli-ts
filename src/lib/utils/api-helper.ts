import { createAPIClient, APIClient } from '../api/client.js';
import { getProfile, loadConfig } from '../config/config.js';
import { getAPIKey } from '../config/keyring.js';
import { Command } from 'commander';
import { formatOutput, type OutputFormat } from '../output/formatter.js';

export async function resolveAPIKey(options: Record<string, unknown>): Promise<string> {
  const config = loadConfig();
  const profileName = (options.profile as string) || config['default-profile'];
  const apiKey = (options.apiKey as string) || process.env.ABSMARTLY_API_KEY || (await getAPIKey(profileName));

  if (!apiKey) {
    throw new Error(
      `No API key found for profile "${profileName}".\n` +
      `Run: abs setup\n` +
      `Or:  abs --endpoint https://your-api.example.com/v1 --api-key YOUR_KEY <command>`
    );
  }

  return apiKey;
}

export function resolveEndpoint(options: Record<string, unknown>): string {
  const config = loadConfig();
  const profileName = (options.profile as string) || config['default-profile'];
  const profile = getProfile(profileName);
  return (options.endpoint as string) || process.env.ABSMARTLY_API_ENDPOINT || profile.api.endpoint;
}

export async function getAPIClientFromOptions(options: Record<string, unknown>): Promise<APIClient> {
  const config = loadConfig();
  const profileName = (options.profile as string) || config['default-profile'];
  const profile = getProfile(profileName);
  const endpoint = (options.endpoint as string) || process.env.ABSMARTLY_API_ENDPOINT || profile.api.endpoint;

  if (!endpoint) {
    throw new Error(
      `No API endpoint configured for profile "${profileName}".\n` +
      `Run: abs setup\n` +
      `Or:  abs --endpoint https://your-api.example.com/v1 --api-key YOUR_KEY <command>`
    );
  }

  const apiKey = await resolveAPIKey(options);

  return createAPIClient(endpoint, apiKey, { verbose: options.verbose as boolean });
}

export interface GlobalOptions extends Record<string, unknown> {
  config?: string;
  apiKey?: string;
  endpoint?: string;
  app?: string;
  env?: string;
  output?: OutputFormat;
  noColor?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  profile?: string;
  terse?: boolean;
  full?: boolean;
  raw?: boolean;
}

const VALID_FORMATS: OutputFormat[] = ['table', 'json', 'yaml', 'plain', 'markdown', 'rendered', 'template', 'vertical'];

export function getGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  const output = (opts.output || 'table') as OutputFormat;

  if (!VALID_FORMATS.includes(output)) {
    throw new Error(
      `Invalid output format: '${output}'. Must be one of: ${VALID_FORMATS.join(', ')}`
    );
  }

  return {
    config: opts.config,
    apiKey: opts.apiKey,
    endpoint: opts.endpoint,
    app: opts.app,
    env: opts.env,
    output,
    noColor: opts.color === false,
    verbose: opts.verbose || false,
    quiet: opts.quiet || false,
    profile: opts.profile,
    terse: opts.terse || false,
    full: opts.full || false,
    raw: opts.raw || false,
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
