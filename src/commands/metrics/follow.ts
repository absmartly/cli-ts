import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseMetricId } from '../../lib/utils/validators.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import { followMetric, unfollowMetric } from '../../core/metrics/follow.js';

export const followCommand = new Command('follow')
  .description('Follow a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (id: MetricId) => {
      const globalOptions = getGlobalOptions(followCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await followMetric(client, { id });
      printResult(globalOptions, { message: `✓ Now following metric ${id}`, id });
    })
  );

export const unfollowCommand = new Command('unfollow')
  .description('Unfollow a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (id: MetricId) => {
      const globalOptions = getGlobalOptions(unfollowCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await unfollowMetric(client, { id });
      printResult(globalOptions, { message: `✓ No longer following metric ${id}`, id });
    })
  );
