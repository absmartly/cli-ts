import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseUserId } from '../../lib/utils/validators.js';
import type { UserId } from '../../lib/api/branded-types.js';

export const resetPasswordCommand = new Command('reset-password')
  .description('Reset a user password')
  .argument('<id>', 'user ID', parseUserId)
  .action(withErrorHandling(async (id: UserId) => {
    const globalOptions = getGlobalOptions(resetPasswordCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const result = await client.resetUserPassword(id);
    console.log(chalk.green(`✓ Password reset for user ${id}`));
    console.log(`  New password: ${result.password}`);
    console.log(chalk.yellow('  Save this password — it cannot be retrieved later.'));
  }));
