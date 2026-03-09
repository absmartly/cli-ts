import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseApplicationId } from '../../lib/utils/validators.js';
import type { ApplicationId } from '../../lib/api/branded-types.js';

export const appsCommand = new Command('apps')
  .alias('app')
  .alias('application')
  .description('Application commands');

const listCommand = new Command('list')
  .description('List all applications')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const apps = await client.listApplications();
    printFormatted(apps, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get application details')
  .argument('<id>', 'application ID', parseApplicationId)
  .action(withErrorHandling(async (id: ApplicationId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const app = await client.getApplication(id);
    printFormatted(app, globalOptions);
  }));

appsCommand.addCommand(listCommand);
appsCommand.addCommand(getCommand);
