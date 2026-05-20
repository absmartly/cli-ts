import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseGoalId } from '../../lib/utils/validators.js';
import type { GoalId } from '../../lib/api/branded-types.js';
import { followGoal, unfollowGoal } from '../../core/goals/follow.js';

export const followCommand = new Command('follow')
  .description('Follow a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .action(
    withErrorHandling(async (id: GoalId) => {
      const globalOptions = getGlobalOptions(followCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await followGoal(client, { id });
      printResult(globalOptions, { message: `✓ Now following goal ${id}`, id });
    })
  );

export const unfollowCommand = new Command('unfollow')
  .description('Unfollow a goal')
  .argument('<id>', 'goal ID', parseGoalId)
  .action(
    withErrorHandling(async (id: GoalId) => {
      const globalOptions = getGlobalOptions(unfollowCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await unfollowGoal(client, { id });
      printResult(globalOptions, { message: `✓ No longer following goal ${id}`, id });
    })
  );
