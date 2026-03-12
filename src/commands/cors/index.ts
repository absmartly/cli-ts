import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseCorsOriginId } from '../../lib/utils/validators.js';
import type { CorsOriginId } from '../../lib/api/branded-types.js';

export const corsCommand = new Command('cors')
  .description('CORS origins management');

const listCommand = new Command('list')
  .description('List CORS allowed origins')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const origins = await client.listCorsOrigins();
    printFormatted(origins, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get CORS origin details')
  .argument('<id>', 'CORS origin ID', parseCorsOriginId)
  .action(withErrorHandling(async (id: CorsOriginId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const origin = await client.getCorsOrigin(id);
    printFormatted(origin, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new CORS allowed origin')
  .requiredOption('--origin <url>', 'origin URL')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const origin = await client.createCorsOrigin({ origin: options.origin });
    console.log(chalk.green(`✓ CORS origin created`));
    printFormatted(origin, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a CORS allowed origin')
  .argument('<id>', 'CORS origin ID', parseCorsOriginId)
  .requiredOption('--origin <url>', 'new origin URL')
  .action(withErrorHandling(async (id: CorsOriginId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const origin = await client.updateCorsOrigin(id, { origin: options.origin });
    console.log(chalk.green(`✓ CORS origin ${id} updated`));
    printFormatted(origin, globalOptions);
  }));

const deleteCommand = new Command('delete')
  .description('Delete a CORS allowed origin')
  .argument('<id>', 'CORS origin ID', parseCorsOriginId)
  .action(withErrorHandling(async (id: CorsOriginId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.deleteCorsOrigin(id);
    console.log(chalk.green(`✓ CORS origin ${id} deleted`));
  }));

corsCommand.addCommand(listCommand);
corsCommand.addCommand(getCommand);
corsCommand.addCommand(createCommand);
corsCommand.addCommand(updateCommand);
corsCommand.addCommand(deleteCommand);
