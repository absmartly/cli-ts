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
import { metricsCommand } from './metrics.js';
import { deleteCommand } from './delete.js';
import { parentCommand } from './parent.js';
import { accessCommand } from './access.js';
import { followCommand, unfollowCommand } from './follow.js';
import { annotationsCommand } from './annotations.js';
import { alertsCommand } from './alerts.js';
import { recommendationsCommand } from './recommendations.js';

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
experimentsCommand.addCommand(metricsCommand);
experimentsCommand.addCommand(deleteCommand);
experimentsCommand.addCommand(parentCommand);
experimentsCommand.addCommand(accessCommand);
experimentsCommand.addCommand(followCommand);
experimentsCommand.addCommand(unfollowCommand);
experimentsCommand.addCommand(annotationsCommand);
experimentsCommand.addCommand(alertsCommand);
experimentsCommand.addCommand(recommendationsCommand);
