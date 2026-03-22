import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { homedir } from 'os';
import { stat } from 'fs/promises';
import { getProfile, loadConfig } from '../../lib/config/config.js';
import { getAPIKey } from '../../lib/config/keyring.js';
import { createAPIClient } from '../../lib/api/client.js';
import { withErrorHandling, getGlobalOptions } from '../../lib/utils/api-helper.js';

export const doctorCommand = new Command('doctor')
  .description('Diagnose configuration issues')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(doctorCommand);
    console.log(chalk.bold('\n🔍 ABSmartly CLI Diagnostics\n'));

    let allGood = true;

    try {
      const config = loadConfig();
      console.log(chalk.green('✓') + ' Configuration file loaded');

      const profileName = (globalOptions.profile as string) || config['default-profile'];
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
      try {
        const cachePath = join(homedir(), '.config', 'absmartly', 'custom-fields-cache.json');
        const cacheStat = await stat(cachePath);
        const ageMs = Date.now() - cacheStat.mtimeMs;
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
        const ageLabel = ageDays > 0 ? `${ageDays}d ago` : `${ageHours}h ago`;
        console.log(chalk.green('✓') + ` Custom fields cache exists (updated ${ageLabel})`);
      } catch {
        console.log(chalk.yellow('⚠') + ' Custom fields cache not found');
        console.log(chalk.yellow('  Run: abs experiments refresh-fields'));
      }

      try {
        const credentialsPath = join(homedir(), '.config', 'absmartly', 'credentials.json');
        const credStat = await stat(credentialsPath);
        const mode = credStat.mode & 0o777;
        if (mode === 0o600) {
          console.log(chalk.green('✓') + ' Credentials file permissions OK (600)');
        } else {
          const modeStr = mode.toString(8);
          console.log(chalk.yellow('⚠') + ` Credentials file permissions are ${modeStr} (expected 600)`);
        }
      } catch {
      }

      if (apiKey) {
        try {
          const staleClient = createAPIClient(profile.api.endpoint, apiKey);
          const experiments = await staleClient.listExperiments({ state: 'created' });
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          let staleCount = 0;
          for (const exp of experiments) {
            const rec = exp as Record<string, unknown>;
            const updatedAt = rec.updated_at as string | number | undefined;
            if (updatedAt && new Date(updatedAt).getTime() < sevenDaysAgo) {
              staleCount++;
            }
          }
          if (staleCount > 0) {
            console.log(chalk.yellow('⚠') + ` ${staleCount} experiments stuck in 'created' state`);
          } else {
            console.log(chalk.green('✓') + ' No stale experiments in created state');
          }
        } catch {
        }
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
  }));
