import { Command } from 'commander';
import chalk from 'chalk';
import { setProfile, getProfile, loadConfig } from '../../lib/config/config.js';
import { setAPIKey, getAPIKey, deleteAPIKey } from '../../lib/config/keyring.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, resolveAPIKey, resolveEndpoint, withErrorHandling } from '../../lib/utils/api-helper.js';
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
  .option('--show-key', 'show last 4 characters of API key')
  .action(withErrorHandling(async (options, command) => {
    const config = loadConfig();
    const parentOpts = command.parent?.parent?.opts() || {};
    const profileName = parentOpts.profile || config['default-profile'];

    try {
      const profile = getProfile(profileName);
      const apiKey = await getAPIKey(profileName);

      const keyDisplay = apiKey
        ? (options.showKey ? apiKey : `****...${apiKey.slice(-4)}`)
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
  .action(withErrorHandling(async (_options, command) => {
    const config = loadConfig();
    const parentOpts = command.parent?.parent?.opts() || {};
    const profileName = parentOpts.profile || config['default-profile'];

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

const listApiKeysCommand = new Command('list-api-keys')
  .description('List personal API keys for the current user')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listApiKeysCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const keys = await client.listUserApiKeys();
    printFormatted(keys, globalOptions);
  }));

const getApiKeyCommand = new Command('get-api-key')
  .description('Get a personal API key by ID')
  .argument('<id>', 'API key ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getApiKeyCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const key = await client.getUserApiKey(id);
    printFormatted(key, globalOptions);
  }));

const updateApiKeyCommand = new Command('update-api-key')
  .description('Update a personal API key')
  .argument('<id>', 'API key ID', parseInt)
  .option('--name <name>', 'API key name')
  .option('--description <text>', 'API key description')
  .action(withErrorHandling(async (id: number, options) => {
    const globalOptions = getGlobalOptions(updateApiKeyCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const data: { name?: string; description?: string } = {};
    if (options.name !== undefined) data.name = options.name;
    if (options.description !== undefined) data.description = options.description;
    await client.updateUserApiKey(id, data);
    console.log(chalk.green(`✓ API key ${id} updated`));
  }));

const deleteApiKeyCommand = new Command('delete-api-key')
  .description('Delete a personal API key')
  .argument('<id>', 'API key ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(deleteApiKeyCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.deleteUserApiKey(id);
    console.log(chalk.green(`✓ API key ${id} deleted`));
  }));

const editProfileCommand = new Command('edit-profile')
  .description('Edit current user profile')
  .option('--first-name <name>', 'first name')
  .option('--last-name <name>', 'last name')
  .option('--department <dept>', 'department')
  .option('--job-title <title>', 'job title')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(editProfileCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const data: Record<string, string> = {};
    if (options.firstName !== undefined) data.first_name = options.firstName;
    if (options.lastName !== undefined) data.last_name = options.lastName;
    if (options.department !== undefined) data.department = options.department;
    if (options.jobTitle !== undefined) data.job_title = options.jobTitle;
    const user = await client.updateCurrentUser(data);
    console.log(chalk.green(`✓ Profile updated`));
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    if (name) console.log(`  Name: ${name}`);
    if (user.department) console.log(`  Department: ${user.department}`);
    if (user.job_title) console.log(`  Job Title: ${user.job_title}`);
  }));

authCommand.addCommand(loginCommand);
authCommand.addCommand(statusCommand);
authCommand.addCommand(logoutCommand);
authCommand.addCommand(createApiKeyCommand);
authCommand.addCommand(whoamiCommand);
authCommand.addCommand(listApiKeysCommand);
authCommand.addCommand(getApiKeyCommand);
authCommand.addCommand(updateApiKeyCommand);
authCommand.addCommand(deleteApiKeyCommand);
authCommand.addCommand(editProfileCommand);
