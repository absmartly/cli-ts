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
  .action(withErrorHandling(async () => {
    const rl = readline.createInterface({ input, output });

    try {
      console.log(chalk.bold('\n🚀 ABSmartly CLI Setup\n'));
      console.log('This wizard will help you configure the ABSmartly CLI.\n');

      const apiKey = await rl.question('API Key: ');
      if (!apiKey) {
        console.log(chalk.red('API key is required'));
        process.exit(1);
      }

      const endpoint = await rl.question(
        'API Endpoint [https://api.absmartly.com/v1]: '
      );
      const finalEndpoint = endpoint || 'https://api.absmartly.com/v1';

      console.log(chalk.blue('\nℹ Testing connection...'));

      const client = createAPIClient(finalEndpoint, apiKey);

      try {
        const apps = await client.listApplications();
        console.log(chalk.green('✓ Connection successful\n'));

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
            const idx = parseInt(appChoice) - 1;
            const selectedApp = apps[idx];
            if (idx >= 0 && idx < apps.length && selectedApp) {
              application = selectedApp.name;
            }
          }
        }

        const envChoice = await rl.question('\nDefault environment [production]: ');
        const environment = envChoice || 'production';

        const profile: Profile = {
          api: {
            endpoint: finalEndpoint,
          },
          expctld: {
            endpoint: 'https://ctl.absmartly.io/v1',
          },
          ...(application && { application }),
          environment,
        };

        await setAPIKey(apiKey, 'default');
        setProfile('default', profile);

        console.log(chalk.green('\n✓ Setup complete!\n'));
        console.log('Configuration saved:');
        console.log(`  Profile: default`);
        console.log(`  Endpoint: ${finalEndpoint}`);
        if (application) console.log(`  Application: ${application}`);
        if (environment) console.log(`  Environment: ${environment}`);
        console.log('\nTry running: abs experiments list');
      } catch (error) {
        console.log(chalk.red('✗ Connection failed:'), error instanceof Error ? error.message : error);
        console.log(chalk.yellow('\nPlease verify your API key and endpoint.'));
        process.exit(1);
      }
    } finally {
      rl.close();
    }
  }));
