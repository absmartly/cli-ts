import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { setProfile, type Profile } from '../../lib/config/config.js';
import { setAPIKey } from '../../lib/config/keyring.js';
import { createAPIClient } from '../../lib/api/client.js';
import { withErrorHandling } from '../../lib/utils/api-helper.js';

export const setupCommand = new Command('setup')
  .description('Interactive onboarding wizard')
  .option('--api-key <key>', 'API key (skip interactive prompt)')
  .option('--endpoint <url>', 'API endpoint URL (skip interactive prompt)')
  .option('--profile <name>', 'profile name (default: "default")')
  .option('--app <name>', 'default application name')
  .option('--env <name>', 'default environment name')
  .action(withErrorHandling(async (_options, command) => {
    const options = command.optsWithGlobals();
    const hasInlineArgs = options.apiKey && options.endpoint;

    if (hasInlineArgs) {
      await setupNonInteractive(options);
    } else {
      await setupInteractive(options);
    }
  }));

async function setupNonInteractive(options: Record<string, string>) {
  const profileName = options.profile || 'default';
  const apiKey = options.apiKey!;
  const endpoint = options.endpoint!;

  console.log(chalk.blue('Testing connection...'));

  const client = createAPIClient(endpoint, apiKey);

  try {
    await client.listApplications();
    console.log(chalk.green('Connection successful'));
  } catch (error) {
    console.log(chalk.red('Connection failed:'), error instanceof Error ? error.message : error);
    console.log(chalk.yellow('Please verify your API key and endpoint.'));
    process.exit(1);
  }

  const profile: Profile = {
    api: { endpoint },
    expctld: { endpoint: '' },
  };
  if (options.app) profile.application = options.app;
  if (options.env) profile.environment = options.env;

  await setAPIKey(apiKey, profileName);
  setProfile(profileName, profile);

  console.log(chalk.green('Setup complete!'));
  console.log(`  Profile: ${profileName}`);
  console.log(`  Endpoint: ${endpoint}`);
  if (options.app) console.log(`  Application: ${options.app}`);
  if (options.env) console.log(`  Environment: ${options.env}`);
}

async function setupInteractive(options: Record<string, string>) {
  const profileName = options.profile || 'default';
  const rl = readline.createInterface({ input, output });

  try {
    console.log(chalk.bold('\nABSmartly CLI Setup\n'));
    console.log('This wizard will help you configure the ABSmartly CLI.\n');

    const apiKey = options.apiKey || await rl.question('API Key: ');
    if (!apiKey) {
      console.log(chalk.red('API key is required'));
      process.exit(1);
    }

    const endpoint = options.endpoint || await rl.question('API Endpoint: ');
    if (!endpoint) {
      console.log(chalk.red('API endpoint is required'));
      process.exit(1);
    }

    console.log(chalk.blue('\nTesting connection...'));

    const client = createAPIClient(endpoint, apiKey);

    try {
      const apps = await client.listApplications();
      console.log(chalk.green('Connection successful\n'));

      let application: string | undefined;
      if (apps.length > 0) {
        console.log('Available applications:');
        for (const [idx, app] of apps.entries()) {
          console.log(`  ${idx + 1}. ${app.name}`);
        }

        const appChoice = await rl.question(
          `\nSelect application (1-${apps.length}) or press Enter to skip: `
        );

        if (appChoice) {
          const idx = parseInt(appChoice, 10) - 1;
          const selectedApp = apps[idx];
          if (idx >= 0 && idx < apps.length && selectedApp) {
            application = selectedApp.name;
          }
        }
      }

      const envChoice = await rl.question('\nDefault environment [production]: ');
      const environment = envChoice || 'production';

      const profile: Profile = {
        api: { endpoint },
        expctld: { endpoint: '' },
        ...(application && { application }),
        environment,
      };

      await setAPIKey(apiKey, profileName);
      setProfile(profileName, profile);

      console.log(chalk.green('\nSetup complete!\n'));
      console.log('Configuration saved:');
      console.log(`  Profile: ${profileName}`);
      console.log(`  Endpoint: ${endpoint}`);
      if (application) console.log(`  Application: ${application}`);
      if (environment) console.log(`  Environment: ${environment}`);
      console.log('\nTry running: abs experiments list');
    } catch (error) {
      console.log(chalk.red('Connection failed:'), error instanceof Error ? error.message : error);
      console.log(chalk.yellow('\nPlease verify your API key and endpoint.'));
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}
