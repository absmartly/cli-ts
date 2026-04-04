import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseAssetRoleId } from '../../lib/utils/validators.js';
import type { AssetRoleId } from '../../lib/api/branded-types.js';
import { listAssetRoles, getAssetRole, createAssetRole, updateAssetRole, deleteAssetRole } from '../../core/assetroles/assetroles.js';

export const assetRolesCommand = new Command('asset-roles')
  .alias('assetroles')
  .description('Asset role commands');

const listCommand = new Command('list')
  .description('List all asset roles')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listAssetRoles(client);
    printFormatted(result.data, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get asset role details')
  .argument('<id>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: AssetRoleId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await getAssetRole(client, { id });
    printFormatted(result.data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new asset role')
  .requiredOption('--name <name>', 'asset role name')
  .action(withErrorHandling(async (options: { name: string }) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await createAssetRole(client, { name: options.name });
    console.log(chalk.green(`✓ Asset role created with ID: ${(result.data as Record<string, unknown>).id}`));
  }));

const updateCommand = new Command('update')
  .description('Update an asset role')
  .argument('<id>', 'asset role ID', parseAssetRoleId)
  .option('--name <name>', 'new name')
  .action(withErrorHandling(async (id: AssetRoleId, options: { name?: string }) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await updateAssetRole(client, { id, name: options.name });
    console.log(chalk.green(`✓ Asset role ${id} updated`));
  }));

const deleteCommand = new Command('delete')
  .description('Delete an asset role')
  .argument('<id>', 'asset role ID', parseAssetRoleId)
  .action(withErrorHandling(async (id: AssetRoleId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await deleteAssetRole(client, { id });
    console.log(chalk.green(`✓ Asset role ${id} deleted`));
  }));

assetRolesCommand.addCommand(listCommand);
assetRolesCommand.addCommand(getCommand);
assetRolesCommand.addCommand(createCommand);
assetRolesCommand.addCommand(updateCommand);
assetRolesCommand.addCommand(deleteCommand);
