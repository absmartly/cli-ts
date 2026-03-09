#!/usr/bin/env node

import { Command } from 'commander';
import { version } from './lib/utils/version.js';
import { experimentsCommand } from './commands/experiments/index.js';
import { authCommand } from './commands/auth/index.js';
import { configCommand } from './commands/config/index.js';
import { versionCommand } from './commands/version/index.js';
import { appsCommand } from './commands/apps/index.js';
import { envsCommand } from './commands/envs/index.js';
import { unitsCommand } from './commands/units/index.js';
import { goalsCommand } from './commands/goals/index.js';
import { segmentsCommand } from './commands/segments/index.js';
import { teamsCommand } from './commands/teams/index.js';
import { usersCommand } from './commands/users/index.js';
import { metricsCommand } from './commands/metrics/index.js';
import { flagsCommand } from './commands/flags/index.js';
import { apiCommand } from './commands/api/index.js';
import { openCommand } from './commands/open/index.js';
import { doctorCommand } from './commands/doctor/index.js';
import { completionCommand } from './commands/completion/index.js';
import { tagsCommand } from './commands/tags/index.js';
import { goalTagsCommand } from './commands/goaltags/index.js';
import { metricTagsCommand } from './commands/metrictags/index.js';
import { metricCategoriesCommand } from './commands/metriccategories/index.js';
import { rolesCommand } from './commands/roles/index.js';
import { permissionsCommand } from './commands/permissions/index.js';
import { apiKeysCommand } from './commands/apikeys/index.js';
import { webhooksCommand } from './commands/webhooks/index.js';
import { generateCommand } from './commands/generate/index.js';
import { setupCommand } from './commands/setup/index.js';
import { customFieldsCommand } from './commands/customfields/index.js';
import { handleFatalError } from './lib/utils/error-handler.js';

const program = new Command();

program
  .name('abs')
  .description('ABSmartly CLI - A/B Testing and Feature Flags command-line tool')
  .version(version)
  .option('--config <path>', 'config file path')
  .option('--api-key <key>', 'override API key')
  .option('--endpoint <url>', 'override API endpoint')
  .option('--app <name>', 'override default application')
  .option('--env <name>', 'override default environment')
  .option('-o, --output <format>', 'output format (table, json, yaml, plain, markdown)', 'table')
  .option('--no-color', 'disable colored output')
  .option('-v, --verbose', 'verbose output')
  .option('-q, --quiet', 'minimal output')
  .option('--profile <name>', 'use specific profile')
  .option('--terse', 'show compact format with truncation')
  .option('--full', 'show full text without truncation');

program.addCommand(experimentsCommand);
program.addCommand(authCommand);
program.addCommand(configCommand);
program.addCommand(versionCommand);
program.addCommand(appsCommand);
program.addCommand(envsCommand);
program.addCommand(unitsCommand);
program.addCommand(goalsCommand);
program.addCommand(segmentsCommand);
program.addCommand(teamsCommand);
program.addCommand(usersCommand);
program.addCommand(metricsCommand);
program.addCommand(flagsCommand);
program.addCommand(apiCommand);
program.addCommand(openCommand);
program.addCommand(doctorCommand);
program.addCommand(completionCommand);
program.addCommand(tagsCommand);
program.addCommand(goalTagsCommand);
program.addCommand(metricTagsCommand);
program.addCommand(metricCategoriesCommand);
program.addCommand(rolesCommand);
program.addCommand(permissionsCommand);
program.addCommand(apiKeysCommand);
program.addCommand(webhooksCommand);
program.addCommand(generateCommand);
program.addCommand(setupCommand);
program.addCommand(customFieldsCommand);

process.on('unhandledRejection', (reason) => handleFatalError('unhandled promise rejection', reason));
process.on('uncaughtException', (error) => handleFatalError('uncaught exception', error));

program.parseAsync().catch((error) => handleFatalError('command parsing', error));
