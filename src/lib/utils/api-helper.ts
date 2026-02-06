import { createAPIClient, APIClient } from '../api/client.js';
import { getProfile, loadConfig } from '../config/config.js';
import { getAPIKey } from '../config/keyring.js';
import { Command } from 'commander';
import type { OutputFormat } from '../output/formatter.js';

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

  const verbose = options.verbose as boolean;

  return createAPIClient(endpoint, apiKey, { verbose });
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

export function getGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  const outputStr = opts.output || 'table';

  const validFormats: OutputFormat[] = ['table', 'json', 'yaml', 'plain', 'markdown'];
  if (!validFormats.includes(outputStr as OutputFormat)) {
    throw new Error(
      `Invalid output format: '${outputStr}'. Must be one of: ${validFormats.join(', ')}`
    );
  }

  const output: OutputFormat = outputStr as OutputFormat;

  return {
    config: opts.config,
    apiKey: opts.apiKey,
    endpoint: opts.endpoint,
    app: opts.app,
    env: opts.env,
    output,
    noColor: opts.noColor || false,
    verbose: opts.verbose || false,
    quiet: opts.quiet || false,
    profile: opts.profile,
    terse: opts.terse || false,
    full: opts.full || false,
  };
}
