import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseScheduledActionId } from '../../lib/utils/validators.js';
import type { ExperimentId, ScheduledActionId } from '../../lib/api/branded-types.js';

const VALID_ACTIONS = ['start', 'restart', 'development', 'stop', 'archive', 'full_on'] as const;

export const scheduleCommand = new Command('schedule')
  .description('Manage scheduled actions for experiments');

const createScheduleCommand = new Command('create')
  .description('Schedule a future action on an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--action <action>', `action to schedule (${VALID_ACTIONS.join(', ')})`)
  .requiredOption('--at <datetime>', 'ISO 8601 datetime (e.g., 2026-04-01T10:00:00Z)')
  .option('--note <text>', 'note about the scheduled action', 'Scheduled via CLI')
  .option('--reason <reason>', 'reason for the action')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(createScheduleCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    if (!(VALID_ACTIONS as readonly string[]).includes(options.action)) {
      throw new Error(
        `Invalid action: "${options.action}"\n` +
        `Valid actions: ${VALID_ACTIONS.join(', ')}`
      );
    }

    if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(options.at)) {
      throw new Error(
        `Missing timezone in datetime: "${options.at}"\n` +
        `Provide an ISO 8601 timestamp with Z or an offset (e.g., 2026-04-01T10:00:00Z)`
      );
    }

    const date = new Date(options.at);
    if (isNaN(date.getTime())) {
      throw new Error(
        `Invalid datetime: "${options.at}"\n` +
        `Expected ISO 8601 format (e.g., 2026-04-01T10:00:00Z)`
      );
    }

    if (date.getTime() <= Date.now()) {
      throw new Error(
        `Scheduled time must be in the future.\n` +
        `Provided: ${options.at}`
      );
    }

    const scheduledAction = await client.createScheduledAction(
      id,
      options.action,
      date.toISOString(),
      options.note,
      options.reason
    );

    console.log(chalk.green(`✓ Scheduled "${options.action}" for experiment ${id}`));
    if (scheduledAction.id) {
      console.log(`  Scheduled action ID: ${scheduledAction.id}`);
    }
    console.log(`  Scheduled at: ${date.toISOString()}`);
  }));

const deleteScheduleCommand = new Command('delete')
  .description('Delete a scheduled action')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<actionId>', 'scheduled action ID', parseScheduledActionId)
  .action(withErrorHandling(async (experimentId: ExperimentId, actionId: ScheduledActionId) => {
    const globalOptions = getGlobalOptions(deleteScheduleCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.deleteScheduledAction(experimentId, actionId);
    console.log(chalk.green(`✓ Scheduled action ${actionId} deleted from experiment ${experimentId}`));
  }));

scheduleCommand.addCommand(createScheduleCommand);
scheduleCommand.addCommand(deleteScheduleCommand);
