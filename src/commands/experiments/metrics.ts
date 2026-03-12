import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseMetricId } from '../../lib/utils/validators.js';
import type { ExperimentId, MetricId } from '../../lib/api/branded-types.js';

export const metricsCommand = new Command('metrics')
  .description('Manage experiment metrics');

const listCommand = new Command('list')
  .description('List metrics for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const metrics = await client.listExperimentMetrics(id);
    printFormatted(metrics, globalOptions);
  }));

const addCommand = new Command('add')
  .description('Add metrics to an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--metrics <ids>', 'comma-separated metric IDs')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(addCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const metricIds = options.metrics.split(',').map((s: string) => parseMetricId(s.trim()));
    await client.addExperimentMetrics(id, metricIds);
    console.log(chalk.green(`✓ Metrics added to experiment ${id}`));
  }));

const confirmImpactCommand = new Command('confirm-impact')
  .description('Confirm metric impact for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentId: ExperimentId, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(confirmImpactCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.confirmMetricImpact(experimentId, metricId);
    console.log(chalk.green(`✓ Metric impact confirmed for experiment ${experimentId}, metric ${metricId}`));
  }));

const excludeCommand = new Command('exclude')
  .description('Exclude a metric from an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentId: ExperimentId, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(excludeCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.excludeExperimentMetric(experimentId, metricId);
    console.log(chalk.green(`✓ Metric ${metricId} excluded from experiment ${experimentId}`));
  }));

const includeCommand = new Command('include')
  .description('Include a metric in an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentId: ExperimentId, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(includeCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.includeExperimentMetric(experimentId, metricId);
    console.log(chalk.green(`✓ Metric ${metricId} included in experiment ${experimentId}`));
  }));

const removeImpactCommand = new Command('remove-impact')
  .description('Remove metric impact from an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<metricId>', 'metric ID', parseMetricId)
  .action(withErrorHandling(async (experimentId: ExperimentId, metricId: MetricId) => {
    const globalOptions = getGlobalOptions(removeImpactCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.removeMetricImpact(experimentId, metricId);
    console.log(chalk.green(`✓ Metric impact removed for experiment ${experimentId}, metric ${metricId}`));
  }));

metricsCommand.addCommand(listCommand);
metricsCommand.addCommand(addCommand);
metricsCommand.addCommand(confirmImpactCommand);
metricsCommand.addCommand(excludeCommand);
metricsCommand.addCommand(includeCommand);
metricsCommand.addCommand(removeImpactCommand);
