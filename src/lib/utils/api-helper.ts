import { createAPIClient, APIClient } from '../api/client.js';
import { getProfile, loadConfig } from '../config/config.js';
import { getAPIKey } from '../config/keyring.js';
import { Command } from 'commander';
import { formatOutput, type OutputFormat } from '../output/formatter.js';

export async function getAPIClientFromOptions(options: Record<string, unknown>): Promise<APIClient> {
  const config = loadConfig();
  const profileName = (options.profile as string) || config['default-profile'];
  const profile = getProfile(profileName);

  const endpoint = (options.endpoint as string) || profile.api.endpoint;
  const apiKey = (options.apiKey as string) || (await getAPIKey(profileName));

  if (!apiKey) {
    throw new Error(
      `No API key found for profile "${profileName}".\n` +
      `Run: abs auth login --api-key YOUR_KEY --endpoint ${endpoint}\n` +
      `Or: abs setup  # for interactive configuration`
    );
  }

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
}

const VALID_FORMATS: OutputFormat[] = ['table', 'json', 'yaml', 'plain', 'markdown'];

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
