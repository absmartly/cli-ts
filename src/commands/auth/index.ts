import { Command } from 'commander';
import { setProfile, getProfile, loadConfig } from '../../lib/config/config.js';
import { setAPIKey, getAPIKey, deleteAPIKey } from '../../lib/config/keyring.js';
import { withErrorHandling } from '../../lib/utils/api-helper.js';

export const authCommand = new Command('auth').description('Authentication commands');

const loginCommand = new Command('login')
  .description('Authenticate with ABSmartly and store credentials')
  .requiredOption('--api-key <key>', 'ABSmartly API key')
  .requiredOption('--endpoint <url>', 'API endpoint URL')
  .option('--app <name>', 'default application name')
  .option('--env <name>', 'default environment name')
  .option('--profile <name>', 'profile name to save credentials under')
  .action(withErrorHandling(async (options) => {
    const profileName = options.profile || 'default';

    await setAPIKey(options.apiKey, profileName);

    const profile = {
      api: {
        endpoint: options.endpoint,
      },
      expctld: {
        endpoint: 'https://ctl.absmartly.io/v1',
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
      console.error('Not authenticated. Run `abs auth login` to authenticate.');
      process.exit(1);
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

authCommand.addCommand(loginCommand);
authCommand.addCommand(statusCommand);
authCommand.addCommand(logoutCommand);
