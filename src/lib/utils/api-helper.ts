import { createAPIClient, APIClient } from '../api/client.js';
import { getProfile, loadConfig } from '../config/config.js';
import { getAPIKey } from '../config/keyring.js';
import { Command } from 'commander';

export async function getAPIClientFromOptions(options: Record<string, unknown>): Promise<APIClient> {
  const config = loadConfig();
  const profileName = (options.profile as string) || config['default-profile'];
  const profile = getProfile(profileName);

  const endpoint = (options.endpoint as string) || profile.api.endpoint;
  let apiKey = (options.apiKey as string) || (await getAPIKey(profileName));

  if (!apiKey) {
    console.error('Error: No API key found. Run `abs auth login` to authenticate.');
    process.exit(1);
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
  output?: string;
  noColor?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  profile?: string;
  terse?: boolean;
  full?: boolean;
}

export function getGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  return {
    config: opts.config,
    apiKey: opts.apiKey,
    endpoint: opts.endpoint,
    app: opts.app,
    env: opts.env,
    output: opts.output || 'table',
    noColor: opts.noColor || false,
    verbose: opts.verbose || false,
    quiet: opts.quiet || false,
    profile: opts.profile,
    terse: opts.terse || false,
    full: opts.full || false,
  };
}
