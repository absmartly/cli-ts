import { Command } from 'commander';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const permissionsCommand = new Command('permissions')
  .aliases(['permission', 'perms', 'perm'])
  .description('Permission commands');

const listCommand = new Command('list')
  .description('List all permissions')
  .action(async () => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const permissions = await client.listPermissions();

      const output = formatOutput(permissions, globalOptions.output, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const categoriesCommand = new Command('categories')
  .aliases(['cats', 'cat'])
  .description('List permission categories')
  .action(async () => {
    try {
      const globalOptions = getGlobalOptions(categoriesCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const categories = await client.listPermissionCategories();

      const output = formatOutput(categories, globalOptions.output, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

permissionsCommand.addCommand(listCommand);
permissionsCommand.addCommand(categoriesCommand);
