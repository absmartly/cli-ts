import { Command } from 'commander';
import {
  loadConfig,
  listProfiles,
  setDefaultProfile,
  getConfigValue,
  setConfigValue,
  unsetConfigValue,
  deleteProfile,
} from '../../lib/config/config.js';
import { withErrorHandling } from '../../lib/utils/api-helper.js';

export const configCommand = new Command('config').description('Configuration commands');

const listCommand = new Command('list')
  .description('List all configuration values')
  .option('--profile <name>', 'profile name')
  .action(withErrorHandling(async (options) => {
    const config = loadConfig();
    const profileName = options.profile || config['default-profile'];
    const profile = config.profiles[profileName];

    if (!profile) {
      console.error(`Profile "${profileName}" not found`);
      process.exit(1);
    }

    console.log(`Profile: ${profileName}`);
    console.log(`Endpoint: ${profile.api.endpoint}`);
    if (profile.application) console.log(`Application: ${profile.application}`);
    if (profile.environment) console.log(`Environment: ${profile.environment}`);
    console.log(`Output: ${config.output}`);
    console.log(`Analytics Opt-Out: ${config['analytics-opt-out']}`);
  }));

const getCommand = new Command('get')
  .description('Get a specific configuration value')
  .argument('<key>', 'configuration key')
  .action(withErrorHandling(async (key: string) => {
    const value = getConfigValue(key);
    if (value !== undefined) {
      console.log(value);
    } else {
      console.error(`Key "${key}" not found`);
      process.exit(1);
    }
  }));

const setCommand = new Command('set')
  .description('Set a configuration value')
  .argument('<key>', 'configuration key')
  .argument('<value>', 'configuration value')
  .action(withErrorHandling(async (key: string, value: string) => {
    setConfigValue(key, value);
    console.log(`Set ${key} = ${value}`);
  }));

const unsetCommand = new Command('unset')
  .description('Remove a configuration value')
  .argument('<key>', 'configuration key')
  .action(withErrorHandling(async (key: string) => {
    unsetConfigValue(key);
    console.log(`Unset ${key}`);
  }));

const profilesCommand = new Command('profiles').description('Manage configuration profiles');

profilesCommand
  .command('list')
  .description('List all profiles')
  .action(withErrorHandling(async () => {
    const profiles = listProfiles();
    const config = loadConfig();
    for (const name of profiles) {
      const marker = name === config['default-profile'] ? ' (default)' : '';
      console.log(`${name}${marker}`);
    }
  }));

profilesCommand
  .command('use')
  .description('Set default profile')
  .argument('<name>', 'profile name')
  .action(withErrorHandling(async (name: string) => {
    setDefaultProfile(name);
    console.log(`Set default profile to "${name}"`);
  }));

profilesCommand
  .command('delete')
  .description('Delete a profile')
  .argument('<name>', 'profile name')
  .action(withErrorHandling(async (name: string) => {
    deleteProfile(name);
    console.log(`Deleted profile "${name}"`);
  }));

configCommand.addCommand(listCommand);
configCommand.addCommand(getCommand);
configCommand.addCommand(setCommand);
configCommand.addCommand(unsetCommand);
configCommand.addCommand(profilesCommand);
