import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseMetricId } from '../../lib/utils/validators.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import {
  getMetricReview,
  requestMetricReview,
  approveMetricReview,
  listMetricReviewComments,
  addMetricReviewComment,
  replyToMetricReviewComment,
} from '../../core/metrics/review.js';

export const reviewCommand = new Command('review').description('Manage metric reviews');

const statusCommand = new Command('status')
  .description('Show metric review status')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (id: MetricId) => {
      const globalOptions = getGlobalOptions(statusCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await getMetricReview(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const requestCommand = new Command('request')
  .description('Request a metric review')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (id: MetricId) => {
      const globalOptions = getGlobalOptions(requestCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await requestMetricReview(client, { id });
      console.log(chalk.green(`✓ Review requested for metric ${id}`));
    })
  );

const approveCommand = new Command('approve')
  .description('Approve a metric review')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (id: MetricId) => {
      const globalOptions = getGlobalOptions(approveCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await approveMetricReview(client, { id });
      console.log(chalk.green(`✓ Metric ${id} review approved`));
    })
  );

const commentsCommand = new Command('comments')
  .description('List metric review comments')
  .argument('<id>', 'metric ID', parseMetricId)
  .action(
    withErrorHandling(async (id: MetricId) => {
      const globalOptions = getGlobalOptions(commentsCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await listMetricReviewComments(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const commentCommand = new Command('comment')
  .description('Add a comment to a metric review')
  .argument('<id>', 'metric ID', parseMetricId)
  .requiredOption('--message <text>', 'comment message')
  .action(
    withErrorHandling(async (id: MetricId, options: { message: string }) => {
      const globalOptions = getGlobalOptions(commentCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await addMetricReviewComment(client, { id, message: options.message });
      console.log(chalk.green(`✓ Comment added to metric ${id} review`));
    })
  );

const replyCommand = new Command('reply')
  .description('Reply to a metric review comment')
  .argument('<id>', 'metric ID', parseMetricId)
  .argument('<commentId>', 'comment ID', parseInt)
  .requiredOption('--message <text>', 'reply message')
  .action(
    withErrorHandling(async (id: MetricId, commentId: number, options: { message: string }) => {
      const globalOptions = getGlobalOptions(replyCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await replyToMetricReviewComment(client, { id, commentId, message: options.message });
      console.log(chalk.green(`✓ Reply added to comment ${commentId} on metric ${id} review`));
    })
  );

reviewCommand.addCommand(statusCommand);
reviewCommand.addCommand(requestCommand);
reviewCommand.addCommand(approveCommand);
reviewCommand.addCommand(commentsCommand);
reviewCommand.addCommand(commentCommand);
reviewCommand.addCommand(replyCommand);
