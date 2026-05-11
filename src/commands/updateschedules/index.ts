import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseUpdateScheduleId, validateJSON } from '../../lib/utils/validators.js';
import type { UpdateScheduleId } from '../../lib/api/branded-types.js';
import {
  listUpdateSchedules,
  getUpdateSchedule,
  createUpdateSchedule,
  updateUpdateSchedule,
  deleteUpdateSchedule,
} from '../../core/updateschedules/updateschedules.js';

export const updateSchedulesCommand = new Command('update-schedules')
  .aliases(['updateschedules'])
  .description('Experiment update schedule management');

const listCommand = new Command('list').description('List experiment update schedules').action(
  withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listUpdateSchedules(client);
    printFormatted(result.data, globalOptions);
  })
);

const getCommand = new Command('get')
  .description('Get update schedule details')
  .argument('<id>', 'update schedule ID', parseUpdateScheduleId)
  .action(
    withErrorHandling(async (id: UpdateScheduleId) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await getUpdateSchedule(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new update schedule')
  .requiredOption('--json-config <json>', 'schedule configuration as JSON')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.jsonConfig, '--json-config') as Record<string, unknown>;
      const result = await createUpdateSchedule(client, { config });
      console.log(chalk.green(`✓ Update schedule created`));
      printFormatted(result.data, globalOptions);
    })
  );

const updateCommand = new Command('update')
  .description('Update an update schedule')
  .argument('<id>', 'update schedule ID', parseUpdateScheduleId)
  .requiredOption('--json-config <json>', 'schedule configuration as JSON')
  .action(
    withErrorHandling(async (id: UpdateScheduleId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.jsonConfig, '--json-config') as Record<string, unknown>;
      const result = await updateUpdateSchedule(client, { id, config });
      console.log(chalk.green(`✓ Update schedule ${id} updated`));
      printFormatted(result.data, globalOptions);
    })
  );

const deleteCommand = new Command('delete')
  .description('Delete an update schedule')
  .argument('<id>', 'update schedule ID', parseUpdateScheduleId)
  .action(
    withErrorHandling(async (id: UpdateScheduleId) => {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await deleteUpdateSchedule(client, { id });
      console.log(chalk.green(`✓ Update schedule ${id} deleted`));
    })
  );

updateSchedulesCommand.addCommand(listCommand);
updateSchedulesCommand.addCommand(getCommand);
updateSchedulesCommand.addCommand(createCommand);
updateSchedulesCommand.addCommand(updateCommand);
updateSchedulesCommand.addCommand(deleteCommand);
