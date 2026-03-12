import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseUpdateScheduleId, validateJSON } from '../../lib/utils/validators.js';
import type { UpdateScheduleId } from '../../lib/api/branded-types.js';

export const updateSchedulesCommand = new Command('update-schedules')
  .aliases(['updateschedules'])
  .description('Experiment update schedule management');

const listCommand = new Command('list')
  .description('List experiment update schedules')
  .action(withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const schedules = await client.listUpdateSchedules();
    printFormatted(schedules, globalOptions);
  }));

const getCommand = new Command('get')
  .description('Get update schedule details')
  .argument('<id>', 'update schedule ID', parseUpdateScheduleId)
  .action(withErrorHandling(async (id: UpdateScheduleId) => {
    const globalOptions = getGlobalOptions(getCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const schedule = await client.getUpdateSchedule(id);
    printFormatted(schedule, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create a new update schedule')
  .requiredOption('--config <json>', 'schedule configuration as JSON')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const schedule = await client.createUpdateSchedule(config);
    console.log(chalk.green(`✓ Update schedule created`));
    printFormatted(schedule, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update an update schedule')
  .argument('<id>', 'update schedule ID', parseUpdateScheduleId)
  .requiredOption('--config <json>', 'schedule configuration as JSON')
  .action(withErrorHandling(async (id: UpdateScheduleId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const config = validateJSON(options.config, '--config') as Record<string, unknown>;
    const schedule = await client.updateUpdateSchedule(id, config);
    console.log(chalk.green(`✓ Update schedule ${id} updated`));
    printFormatted(schedule, globalOptions);
  }));

const deleteCommand = new Command('delete')
  .description('Delete an update schedule')
  .argument('<id>', 'update schedule ID', parseUpdateScheduleId)
  .action(withErrorHandling(async (id: UpdateScheduleId) => {
    const globalOptions = getGlobalOptions(deleteCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.deleteUpdateSchedule(id);
    console.log(chalk.green(`✓ Update schedule ${id} deleted`));
  }));

updateSchedulesCommand.addCommand(listCommand);
updateSchedulesCommand.addCommand(getCommand);
updateSchedulesCommand.addCommand(createCommand);
updateSchedulesCommand.addCommand(updateCommand);
updateSchedulesCommand.addCommand(deleteCommand);
