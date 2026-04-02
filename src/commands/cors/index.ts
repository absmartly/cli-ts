import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseCorsOriginId } from '../../lib/utils/validators.js';
import type { CorsOriginId } from '../../lib/api/branded-types.js';
import { listCorsOrigins } from '../../core/cors/list.js';
import { getCorsOrigin } from '../../core/cors/get.js';
import { createCorsOrigin } from '../../core/cors/create.js';
import { updateCorsOrigin } from '../../core/cors/update.js';
import { deleteCorsOrigin } from '../../core/cors/delete.js';

export const corsCommand = new Command('cors')
  .description('CORS origins management');

const listCommand = new Command('list')
  .description('List CORS allowed origins')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listCorsOrigins(client);
    printFormatted(result.data, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get CORS origin details')
  .argument('<id>', 'CORS origin ID', parseCorsOriginId)
  .action(withErrorHandling(async (id: CorsOriginId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await getCorsOrigin(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new CORS allowed origin')
  .requiredOption('--origin <url>', 'origin URL')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await createCorsOrigin(client, { origin: options.origin });
    console.log(chalk.green(`✓ CORS origin created`));
    printFormatted(result.data, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update a CORS allowed origin')
  .argument('<id>', 'CORS origin ID', parseCorsOriginId)
  .requiredOption('--origin <url>', 'new origin URL')
  .action(withErrorHandling(async (id: CorsOriginId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await updateCorsOrigin(client, { id, origin: options.origin });
    console.log(chalk.green(`✓ CORS origin ${id} updated`));
    printFormatted(result.data, globalOptions);
  }));

const deleteCommand = new Command('delete')
  .description('Delete a CORS allowed origin')
  .argument('<id>', 'CORS origin ID', parseCorsOriginId)
  .action(withErrorHandling(async (id: CorsOriginId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await deleteCorsOrigin(client, { id });
    console.log(chalk.green(`✓ CORS origin ${id} deleted`));
  }));

corsCommand.addCommand(listCommand);
corsCommand.addCommand(getCommand);
corsCommand.addCommand(createCommand);
corsCommand.addCommand(updateCommand);
corsCommand.addCommand(deleteCommand);
