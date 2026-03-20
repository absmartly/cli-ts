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
import { exportCommand } from './export.js';
import { requestUpdateCommand } from './request-update.js';

const subcommands = [
  listCommand, getCommand, searchCommand, createCommand, updateCommand,
  startCommand, stopCommand, archiveCommand, activityCommand, generateTemplateCommand,
  developmentCommand, restartCommand, fullOnCommand, scheduleCommand, metricsCommand,
  deleteCommand, parentCommand, accessCommand, followCommand, unfollowCommand,
  annotationsCommand, alertsCommand, recommendationsCommand, exportCommand, requestUpdateCommand,
];

export const experimentsCommand = new Command('experiments')
  .alias('exp')
  .alias('experiment')
  .alias('features')
  .alias('feature')
  .description('Experiment and feature flag commands');

for (const cmd of subcommands) experimentsCommand.addCommand(cmd);

