import { Command } from 'commander';
import chalk from 'chalk';
import { setProfile, getProfile, loadConfig } from '../../lib/config/config.js';
import { setAPIKey, getAPIKey, deleteAPIKey } from '../../lib/config/keyring.js';
import { getAPIClientFromOptions, getGlobalOptions, resolveEndpoint, withErrorHandling } from '../../lib/utils/api-helper.js';

export const authCommand = new Command('auth').description('Authentication commands');

const loginCommand = new Command('login')
  .description('Authenticate with ABSmartly and store credentials')
  .option('--api-key <key>', 'ABSmartly API key')
  .option('--endpoint <url>', 'API endpoint URL')
  .option('--app <name>', 'default application name')
  .option('--env <name>', 'default environment name')
  .option('--profile <name>', 'profile name to save credentials under')
  .action(withErrorHandling(async (options, command) => {
    const parentOpts = command.parent?.parent?.opts() || {};
    const apiKey = options.apiKey || parentOpts.apiKey;
    const endpoint = options.endpoint || parentOpts.endpoint;

    if (!apiKey) {
      throw new Error('--api-key is required');
    }
    if (!endpoint) {
      throw new Error('--endpoint is required');
    }

    options.apiKey = apiKey;
    options.endpoint = endpoint;
    const profileName = options.profile || parentOpts.profile || 'default';

    await setAPIKey(options.apiKey, profileName);

    const profile = {
      api: {
        endpoint: options.endpoint,
      },
      expctld: {
        endpoint: '',
      },
      application: options.app,
      environment: options.env,
    };

    setProfile(profileName, profile);

    console.log(`✓ Logged in successfully (profile: ${profileName})`);
    console.log(`  Endpoint: ${options.endpoint}`);
    if (options.app) console.log(`  Application: ${options.app}`);
    if (options.env) console.log(`  Environment: ${options.env}`);
  }));

const statusCommand = new Command('status')
  .description('Show current authentication status')
  .option('--profile <name>', 'profile name')
  .option('--show-key', 'show last 4 characters of API key')
  .action(withErrorHandling(async (options) => {
    const config = loadConfig();
    const profileName = options.profile || config['default-profile'];

    try {
      const profile = getProfile(profileName);
      const apiKey = await getAPIKey(profileName);

      const keyDisplay = apiKey
        ? (options.showKey ? '***' + apiKey.slice(-4) : '***hidden***')
        : 'not set';

      console.log(`Profile: ${profileName}`);
      console.log(`Endpoint: ${profile.api.endpoint}`);
      console.log(`API Key: ${keyDisplay}`);
      if (profile.application) console.log(`Application: ${profile.application}`);
      if (profile.environment) console.log(`Environment: ${profile.environment}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('not found') || msg.includes('No API key')) {
        throw new Error('Not authenticated. Run `abs auth login` to authenticate.');
      }
      throw new Error(`Error checking auth status: ${msg || error}`);
    }
  }));

const logoutCommand = new Command('logout')
  .description('Clear stored credentials')
  .option('--profile <name>', 'profile name')
  .action(withErrorHandling(async (options) => {
    const config = loadConfig();
    const profileName = options.profile || config['default-profile'];

    await deleteAPIKey(profileName);
    console.log(`✓ Logged out (profile: ${profileName})`);
  }));

const createApiKeyCommand = new Command('create-api-key')
  .description('Create a personal API key for the current user')
  .requiredOption('--name <name>', 'API key name')
  .option('--description <text>', 'API key description')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createApiKeyCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const apiKey = await client.createUserApiKey(options.name, options.description);
    console.log(chalk.green(`✓ API key created: ${apiKey.name}`));
    console.log(`  Key: ${apiKey.key}`);
    console.log(chalk.yellow('  Save this key now — it cannot be retrieved later.'));
  }));

const whoamiCommand = new Command('whoami')
  .description('Show the currently authenticated user')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(whoamiCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const endpoint = resolveEndpoint(globalOptions);

    const user = await client.getCurrentUser();
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');

    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    if (name) console.log(`Name: ${name}`);
    if (user.department) console.log(`Department: ${user.department}`);
    if (user.job_title) console.log(`Job Title: ${user.job_title}`);
    if (user.last_login_at) console.log(`Last Login: ${user.last_login_at}`);
    if (user.avatar?.base_url) {
      const baseUrl = endpoint.replace(/\/v\d+\/?$/, '');
      console.log(`Avatar: ${baseUrl}${user.avatar.base_url}/${user.avatar.file_name}`);
    }
  }));

authCommand.addCommand(loginCommand);
authCommand.addCommand(statusCommand);
authCommand.addCommand(logoutCommand);
authCommand.addCommand(createApiKeyCommand);
authCommand.addCommand(whoamiCommand);
