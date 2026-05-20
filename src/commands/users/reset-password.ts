import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseUserId } from '../../lib/utils/validators.js';
import type { UserId } from '../../lib/api/branded-types.js';
import { resetUserPassword } from '../../core/users/reset-password.js';

export const resetPasswordCommand = new Command('reset-password')
  .description('Reset a user password')
  .argument('<id>', 'user ID', parseUserId)
  .action(
    withErrorHandling(async (id: UserId) => {
      const globalOptions = getGlobalOptions(resetPasswordCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const result = await resetUserPassword(client, { id });
      const format = globalOptions.output ?? 'table';
      if (format === 'table' || format === 'rendered') {
        console.log(chalk.green(`✓ Password reset for user ${id}`));
        console.log(`  New password: ${result.data.password}`);
        console.log(chalk.yellow('  Save this password — it cannot be retrieved later.'));
      } else {
        printResult(globalOptions, {
          message: `✓ Password reset for user ${id}`,
          id,
          raw: result.data,
        });
      }
    })
  );
