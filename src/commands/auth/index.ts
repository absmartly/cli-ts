import { Command } from 'commander';
import chalk from 'chalk';
import { hostname } from 'os';
import { confirm, password as passwordPrompt } from '@inquirer/prompts';
import { setProfile, getProfile, loadConfig } from '../../lib/config/config.js';
import { setAPIKey, getAPIKey, deleteAPIKey, setOAuthToken, getOAuthToken, deleteOAuthToken } from '../../lib/config/keyring.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, resolveAPIKey, resolveEndpoint, withErrorHandling } from '../../lib/utils/api-helper.js';
import { fetchAndDisplayImage, supportsInlineImages } from '../../lib/utils/terminal-image.js';
import { summarizeUser } from '../../api-client/user-summary.js';
import { startOAuthFlow } from '../../lib/auth/oauth.js';
import { createAPIClient } from '../../lib/api/client.js';

export const authCommand = new Command('auth').description('Authentication commands');

const loginCommand = new Command('login')
  .description('Authenticate with ABSmartly and store credentials')
  .option('--api-key <key>', 'ABSmartly API key')
  .option('--endpoint <url>', 'API endpoint URL')
  .option('--app <name>', 'default application name')
  .option('--env <name>', 'default environment name')
  .option('--profile <name>', 'profile name to save credentials under')
  .option('--no-browser', 'do not open browser (print URL instead)')
  .option('--session', 'use session-based JWT tokens (skip API key creation)')
  .option('--persistent', 'create persistent API key (skip prompt)')
  .action(withErrorHandling(async (options, command) => {
    const parentOpts = command.parent?.parent?.opts() || {};
    const apiKey = options.apiKey || parentOpts.apiKey;
    const endpoint = options.endpoint || parentOpts.endpoint;
    const profileName = options.profile || parentOpts.profile || 'default';

    if (options.session && options.persistent) {
      throw new Error('Cannot use both --session and --persistent');
    }

    if (apiKey) {
      if (!endpoint) {
        throw new Error('--endpoint is required when using --api-key');
      }
      await setAPIKey(apiKey, profileName);
      const profile = {
        api: { endpoint, 'auth-method': 'api-key' as const },
        expctld: { endpoint: '' },
        application: options.app,
        environment: options.env,
      };
      setProfile(profileName, profile);
      console.log(`✓ Logged in successfully (profile: ${profileName})`);
      console.log(`  Endpoint: ${endpoint}`);
      if (options.app) console.log(`  Application: ${options.app}`);
      if (options.env) console.log(`  Environment: ${options.env}`);
      return;
    }

    let resolvedEndpoint = endpoint;
    if (!resolvedEndpoint) {
      try {
        const existingProfile = getProfile(profileName);
        resolvedEndpoint = existingProfile.api.endpoint;
      } catch { /* profile doesn't exist yet */ }
    }

    if (!resolvedEndpoint) {
      throw new Error(
        '--endpoint is required for first-time OAuth login.\n' +
        'Run: abs auth login --endpoint https://your-api.example.com/v1'
      );
    }

    console.log(`Authenticating with ${resolvedEndpoint}...`);

    const tokenResponse = await startOAuthFlow(resolvedEndpoint, {
      noBrowser: options.browser === false,
    });

    console.log('✓ Authentication successful!');

    let usePersistentKey: boolean;
    if (options.persistent) {
      usePersistentKey = true;
    } else if (options.session) {
      usePersistentKey = false;
    } else {
      usePersistentKey = await confirm({
        message: 'Create a persistent API key for this machine? (Recommended — avoids re-authenticating every 24h)',
        default: true,
      });
    }

    if (usePersistentKey) {
      try {
        const tempClient = createAPIClient(resolvedEndpoint, {
          method: 'oauth-jwt',
          token: tokenResponse.accessToken,
        });
        const host = hostname().replace(/\.local$/, '');
        const keyName = `cli-${host}`;
        const created = await tempClient.createUserApiKey(keyName) as { key: string };

        await setAPIKey(created.key, profileName);
        const profile = {
          api: { endpoint: resolvedEndpoint, 'auth-method': 'api-key' as const },
          expctld: { endpoint: '' },
          application: options.app,
          environment: options.env,
        };
        setProfile(profileName, profile);
        console.log(`✓ Persistent API key created and stored (profile: ${profileName})`);
      } catch (error) {
        console.warn(`Warning: Could not create API key (${error instanceof Error ? error.message : error})`);
        console.warn('Falling back to session-based JWT token (expires in 24h).');
        await setOAuthToken(tokenResponse.accessToken, profileName);
        const profile = {
          api: { endpoint: resolvedEndpoint, 'auth-method': 'oauth-jwt' as const },
          expctld: { endpoint: '' },
          application: options.app,
          environment: options.env,
        };
        setProfile(profileName, profile);
      }
    } else {
      await setOAuthToken(tokenResponse.accessToken, profileName);
      const profile = {
        api: { endpoint: resolvedEndpoint, 'auth-method': 'oauth-jwt' as const },
        expctld: { endpoint: '' },
        application: options.app,
        environment: options.env,
      };
      setProfile(profileName, profile);
      console.log(`✓ Session token stored (profile: ${profileName})`);
      console.log('  Note: Token expires in 24h. Re-run `abs auth login` to refresh.');
    }

    console.log(`  Endpoint: ${resolvedEndpoint}`);
    if (options.app) console.log(`  Application: ${options.app}`);
    if (options.env) console.log(`  Environment: ${options.env}`);
  }));

const statusCommand = new Command('status')
  .description('Show current authentication status')
  .option('--show-full-key', 'show full API key (use with caution)')
  .action(withErrorHandling(async (options, command) => {
    const config = loadConfig();
    const parentOpts = command.parent?.parent?.opts() || {};
    const profileName = parentOpts.profile || config['default-profile'];

    try {
      const profile = getProfile(profileName);
      const authMethod = profile.api['auth-method'] ?? 'api-key';

      console.log(`Profile: ${profileName}`);
      console.log(`Endpoint: ${profile.api.endpoint}`);
      console.log(`Auth Method: ${authMethod}`);

      if (authMethod === 'oauth-jwt') {
        const token = await getOAuthToken(profileName);
        if (token) {
          const tokenDisplay = options.showFullKey
            ? token
            : `****...${token.slice(-8)}`;
          console.log(`OAuth Token: ${tokenDisplay}`);

          try {
            const [, payload] = token.split('.');
            if (payload) {
              const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
              if (decoded.exp) {
                const expiresAt = new Date(decoded.exp * 1000);
                const now = new Date();
                if (expiresAt > now) {
                  console.log(`Expires: ${expiresAt.toLocaleString()}`);
                } else {
                  console.log(chalk.yellow(`Token expired: ${expiresAt.toLocaleString()}`));
                  console.log(chalk.yellow('Run `abs auth login` to re-authenticate.'));
                }
              }
            }
          } catch {
            // not a parseable JWT, skip expiry display
          }
        } else {
          console.log('OAuth Token: not set');
        }
      } else {
        const apiKey = await getAPIKey(profileName);
        const keyDisplay = apiKey
          ? (options.showFullKey ? apiKey : `****...${apiKey.slice(-4)}`)
          : 'not set';
        console.log(`API Key: ${keyDisplay}`);
      }

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
    const profile = getProfile(profileName);
    const authMethod = profile.api['auth-method'] ?? 'api-key';

    if (authMethod === 'oauth-jwt') {
      await deleteOAuthToken(profileName);
    } else {
      await deleteAPIKey(profileName);
    }

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

const resetMyPasswordCommand = new Command('reset-my-password')
  .description('Change password for the currently authenticated user')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(resetMyPasswordCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const oldPassword = await passwordPrompt({ message: 'Current password:' });
    const newPassword = await passwordPrompt({ message: 'New password:' });
    const confirmPassword = await passwordPrompt({ message: 'Confirm new password:' });

    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    await client.updateCurrentUser({
      old_password: oldPassword,
      new_password: newPassword,
    } as any);

    console.log(chalk.green('✓ Password changed successfully.'));
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
authCommand.addCommand(resetMyPasswordCommand);
