import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const envsCommand = new Command('envs')
  .alias('env')
  .alias('environment')
  .description('Environment commands');

const listCommand = new Command('list')
  .description('List all environments')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const envs = await client.listEnvironments();
    printFormatted(envs, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get environment details')
  .argument('<id>', 'environment ID', parseInt)
  .action(withErrorHandling(async (id: number) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const env = await client.getEnvironment(id);
    printFormatted(env, globalOptions);
  }));

envsCommand.addCommand(listCommand);
envsCommand.addCommand(getCommand);
