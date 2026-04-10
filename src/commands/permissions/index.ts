import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import {
  listPermissions,
  listPermissionCategories,
  listAccessControlPolicies,
} from '../../core/permissions/list.js';

export const permissionsCommand = new Command('permissions')
  .aliases(['permission', 'perms', 'perm'])
  .description('Permission commands');

const listCommand = new Command('list').description('List all permissions').action(
  withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listPermissions(client);
    printFormatted(result.data, globalOptions);
  })
);

const categoriesCommand = new Command('categories')
  .aliases(['cats', 'cat'])
  .description('List permission categories')
  .action(
    withErrorHandling(async () => {
      const globalOptions = getGlobalOptions(categoriesCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await listPermissionCategories(client);
      printFormatted(result.data, globalOptions);
    })
  );

const policiesCommand = new Command('policies').description('List access control policies').action(
  withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(policiesCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listAccessControlPolicies(client);
    printFormatted(result.data, globalOptions);
  })
);

permissionsCommand.addCommand(listCommand);
permissionsCommand.addCommand(categoriesCommand);
permissionsCommand.addCommand(policiesCommand);
