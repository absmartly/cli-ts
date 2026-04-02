import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseScheduledActionId } from '../../lib/utils/validators.js';
import type { ExperimentId, ScheduledActionId } from '../../lib/api/branded-types.js';
import { createScheduledAction, deleteScheduledAction, VALID_SCHEDULE_ACTIONS } from '../../core/experiments/schedule.js';

export const scheduleCommand = new Command('schedule')
  .description('Manage scheduled actions for experiments');

const createScheduleCommand = new Command('create')
  .description('Schedule a future action on an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--action <action>', `action to schedule (${VALID_SCHEDULE_ACTIONS.join(', ')})`)
  .requiredOption('--at <datetime>', 'ISO 8601 datetime (e.g., 2026-04-01T10:00:00Z)')
  .option('--note <text>', 'note about the scheduled action', 'Scheduled via CLI')
  .option('--reason <reason>', 'reason for the action')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(createScheduleCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const result = await createScheduledAction(client, {
      experimentId: id,
      action: options.action,
      at: options.at,
      note: options.note,
      reason: options.reason,
    });

    console.log(chalk.green(`✓ Scheduled "${options.action}" for experiment ${id}`));
    if (result.data.actionId) {
      console.log(`  Scheduled action ID: ${result.data.actionId}`);
    }
    console.log(`  Scheduled at: ${result.data.scheduledAt}`);
  }));

const deleteScheduleCommand = new Command('delete')
  .description('Delete a scheduled action')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<actionId>', 'scheduled action ID', parseScheduledActionId)
  .action(withErrorHandling(async (experimentId: ExperimentId, actionId: ScheduledActionId) => {
    const globalOptions = getGlobalOptions(deleteScheduleCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await deleteScheduledAction(client, { experimentId, actionId });
    console.log(chalk.green(`✓ Scheduled action ${actionId} deleted from experiment ${experimentId}`));
  }));

scheduleCommand.addCommand(createScheduleCommand);
scheduleCommand.addCommand(deleteScheduleCommand);
