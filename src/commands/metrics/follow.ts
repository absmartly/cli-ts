import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseMetricId } from '../../lib/utils/validators.js';
import type { MetricId } from '../../lib/api/branded-types.js';

export const followCommand = new Command('follow')
  .description('Follow a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (id: MetricId) => {
    const globalOptions = getGlobalOptions(followCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.followMetric(id);
    console.log(chalk.green(`✓ Now following metric ${id}`));
  }));

export const unfollowCommand = new Command('unfollow')
  .description('Unfollow a metric')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (id: MetricId) => {
    const globalOptions = getGlobalOptions(unfollowCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.unfollowMetric(id);
    console.log(chalk.green(`✓ No longer following metric ${id}`));
  }));
