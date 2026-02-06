import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';

export const permissionsCommand = new Command('permissions')
  .aliases(['permission', 'perms', 'perm'])
  .description('Permission commands');

const listCommand = new Command('list')
  .description('List all permissions')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const permissions = await client.listPermissions();
    printFormatted(permissions, globalOptions);
  }));

const categoriesCommand = new Command('categories')
  .aliases(['cats', 'cat'])
  .description('List permission categories')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(categoriesCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const categories = await client.listPermissionCategories();
    printFormatted(categories, globalOptions);
  }));

permissionsCommand.addCommand(listCommand);
permissionsCommand.addCommand(categoriesCommand);
