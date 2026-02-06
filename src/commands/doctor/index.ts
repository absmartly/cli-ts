import { Command } from 'commander';
import chalk from 'chalk';
import { getProfile, loadConfig } from '../../lib/config/config.js';
import { getAPIKey } from '../../lib/config/keyring.js';
import { createAPIClient } from '../../lib/api/client.js';

export const doctorCommand = new Command('doctor')
  .description('Diagnose configuration issues')
  .action(async () => {
    console.log(chalk.bold('\n🔍 ABSmartly CLI Diagnostics\n'));

    let allGood = true;

    try {
      const config = loadConfig();
      console.log(chalk.green('✓') + ' Configuration file loaded');

      const profileName = config['default-profile'];
      console.log(chalk.green('✓') + ` Default profile: ${profileName}`);

      const profile = getProfile(profileName);
      console.log(chalk.green('✓') + ` Profile found: ${profileName}`);

      const apiKey = await getAPIKey(profileName);
      if (!apiKey) {
        console.log(chalk.red('✗') + ' API key not found in keyring');
        console.log(chalk.yellow('  Run: abs auth login --api-key YOUR_KEY'));
        allGood = false;
      } else {
        console.log(chalk.green('✓') + ' API key found');
      }

      console.log(chalk.green('✓') + ` API endpoint: ${profile.api.endpoint}`);

      if (apiKey) {
        console.log(chalk.blue('\nℹ Testing API connectivity...'));
        const client = createAPIClient(profile.api.endpoint, apiKey);

        try {
          await client.listApplications();
          console.log(chalk.green('✓') + ' API connection successful');
        } catch (error) {
          console.log(
            chalk.red('✗') +
              ' API connection failed: ' +
              (error instanceof Error ? error.message : error)
          );
          allGood = false;
        }
      }

      if (profile.application) {
        console.log(chalk.green('✓') + ` Default application: ${profile.application}`);
      } else {
        console.log(chalk.yellow('⚠') + ' No default application set');
      }

      if (profile.environment) {
        console.log(chalk.green('✓') + ` Default environment: ${profile.environment}`);
      } else {
        console.log(chalk.yellow('⚠') + ' No default environment set');
      }
    } catch (error) {
      console.log(chalk.red('✗') + ' Error: ' + (error instanceof Error ? error.message : error));
      allGood = false;
    }

    if (allGood) {
      console.log(chalk.green('\n✓ All checks passed!'));
    } else {
      console.log(chalk.yellow('\n⚠ Some issues found. See messages above.'));
      process.exit(1);
    }
  });
