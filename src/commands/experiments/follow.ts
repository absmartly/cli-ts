import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import { followExperiment, unfollowExperiment } from '../../core/experiments/follow.js';

export const followCommand = new Command('follow')
  .description('Follow an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(
    withErrorHandling(async (id: ExperimentId) => {
      const globalOptions = getGlobalOptions(followCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await followExperiment(client, { experimentId: id });
      printResult(globalOptions, { message: `✓ Now following experiment ${id}`, id });
    })
  );

export const unfollowCommand = new Command('unfollow')
  .description('Unfollow an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(
    withErrorHandling(async (id: ExperimentId) => {
      const globalOptions = getGlobalOptions(unfollowCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await unfollowExperiment(client, { experimentId: id });
      printResult(globalOptions, { message: `✓ No longer following experiment ${id}`, id });
    })
  );
