import { Command } from 'commander';
import chalk from 'chalk';
import { setProfile, getProfile, loadConfig } from '../../lib/config/config.js';
import { setAPIKey, getAPIKey, deleteAPIKey } from '../../lib/config/keyring.js';
import { getAPIClientFromOptions, getGlobalOptions, resolveAPIKey, resolveEndpoint, withErrorHandling } from '../../lib/utils/api-helper.js';
import { fetchAndDisplayImage, supportsInlineImages } from '../../lib/utils/terminal-image.js';
import { summarizeUser } from '../../api-client/user-summary.js';

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
  .option('--avatar [cols]', 'display avatar inline, optional width in columns (default: 20)', parseInt)
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(whoamiCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const endpoint = resolveEndpoint(globalOptions);

    const user = await client.getCurrentUser();
    const summary = summarizeUser(user, endpoint);

    console.log(`ID: ${summary.id}`);
    console.log(`Email: ${summary.email}`);
    if (summary.name) console.log(`Name: ${summary.name}`);
    if (summary.department) console.log(`Department: ${summary.department}`);
    if (summary.job_title) console.log(`Job Title: ${summary.job_title}`);
    if (summary.last_login_at) console.log(`Last Login: ${summary.last_login_at}`);
    if (summary.avatar_url) {
      console.log(`Avatar: ${summary.avatar_url}`);

      if (options.avatar && supportsInlineImages()) {
        const apiKey = await resolveAPIKey(globalOptions);
        await fetchAndDisplayImage(summary.avatar_url, user.avatar?.file_name ?? 'avatar', {
          headers: { Authorization: `Api-Key ${apiKey}` },
          width: typeof options.avatar === 'number' ? options.avatar : 20,
        });
      }
    }
  }));

authCommand.addCommand(loginCommand);
authCommand.addCommand(statusCommand);
authCommand.addCommand(logoutCommand);
authCommand.addCommand(createApiKeyCommand);
authCommand.addCommand(whoamiCommand);
