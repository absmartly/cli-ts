import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseGoalId } from '../../lib/utils/validators.js';
import type { GoalId } from '../../lib/api/branded-types.js';

export const followCommand = new Command('follow')
  .description('Follow a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .action(withErrorHandling(async (id: GoalId) => {
    const globalOptions = getGlobalOptions(followCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.followGoal(id);
    console.log(chalk.green(`✓ Now following goal ${id}`));
  }));

export const unfollowCommand = new Command('unfollow')
  .description('Unfollow a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .action(withErrorHandling(async (id: GoalId) => {
    const globalOptions = getGlobalOptions(unfollowCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.unfollowGoal(id);
    console.log(chalk.green(`✓ No longer following goal ${id}`));
  }));
