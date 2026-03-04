import { Command } from 'commander';
import { listCommand } from './list.js';
import { getCommand } from './get.js';
import { searchCommand } from './search.js';
import { startCommand } from './start.js';
import { stopCommand } from './stop.js';
import { archiveCommand } from './archive.js';
import { activityCommand } from './activity.js';
import { generateTemplateCommand } from './generate-template.js';
import { createCommand } from './create.js';
import { updateCommand } from './update.js';
import { developmentCommand } from './development.js';
import { restartCommand } from './restart.js';
import { fullOnCommand } from './full-on.js';
import { scheduleCommand } from './schedule.js';

export const experimentsCommand = new Command('experiments')
  .alias('exp')
  .alias('experiment')
  .description('Experiment commands');

experimentsCommand.addCommand(listCommand);
experimentsCommand.addCommand(getCommand);
experimentsCommand.addCommand(searchCommand);
experimentsCommand.addCommand(createCommand);
experimentsCommand.addCommand(updateCommand);
experimentsCommand.addCommand(startCommand);
experimentsCommand.addCommand(stopCommand);
experimentsCommand.addCommand(archiveCommand);
experimentsCommand.addCommand(activityCommand);
experimentsCommand.addCommand(generateTemplateCommand);
experimentsCommand.addCommand(developmentCommand);
experimentsCommand.addCommand(restartCommand);
experimentsCommand.addCommand(fullOnCommand);
experimentsCommand.addCommand(scheduleCommand);
