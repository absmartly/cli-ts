import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { readTemplateFile } from '../../lib/template/parser.js';
import { runInteractiveEditor } from '../../lib/interactive/run.js';
import type { ExperimentInput } from '../../api-client/index.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { getDefaultType } from './default-type.js';
import { registerCustomFieldOptions, extractCustomFieldValues } from './custom-field-options.js';
import { validateRestartParams, buildRestartChanges, restartExperiment, VALID_RESTART_REASONS, VALID_RESTART_TYPES } from '../../core/experiments/restart.js';

export const restartCommand = new Command('restart')
  .description('Restart a stopped experiment')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--from-file <path>', 'apply template changes before restarting')
  .option('--note <text>', 'note about the restart', 'Restarted via CLI')
  .option('--reason <reason>', `reason for restart (${VALID_RESTART_REASONS.join(', ')})`)
  .option('--reshuffle', 'reshuffle variant assignments')
  .option('--state <state>', 'target state: running or development', 'running')
  .option('--as-type <type>', `convert type on restart (${VALID_RESTART_TYPES.join(', ')})`);

registerCustomFieldOptions(restartCommand, getDefaultType());

restartCommand
  .option('-i, --interactive', 'interactive step-by-step editor')
  .option('--dry-run', 'show the changes without restarting');

restartCommand.action(withErrorHandling(async (nameOrId: string, options) => {
    const globalOptions = getGlobalOptions(restartCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const id = await client.resolveExperimentId(nameOrId);

    const params = {
      experimentId: id,
      note: options.note,
      reason: options.reason,
      reshuffle: options.reshuffle,
      state: options.state,
      asType: options.asType,
      templateContent: options.fromFile ? readTemplateFile(options.fromFile) : undefined,
      defaultType: getDefaultType(),
      customFieldValues: extractCustomFieldValues(options, getDefaultType(), globalOptions.profile as string),
    };

    validateRestartParams(params);

    let changes: Partial<ExperimentInput> | undefined;

    if (options.interactive) {
      const experiment = await client.getExperiment(id);
      const md = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(md);
      const edited = await runInteractiveEditor(client, template, options.asType || getDefaultType());
      if (!edited) return;
      const result = await buildPayloadFromTemplate(client, edited, options.asType || getDefaultType());
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`Warning: ${warning}`));
      }
      changes = result.payload as Partial<ExperimentInput>;
    } else {
      const built = await buildRestartChanges(client, params);
      for (const warning of built.warnings) {
        console.log(chalk.yellow(`⚠ ${warning}`));
      }
      changes = built.changes;
    }

    if (options.dryRun) {
      console.log(chalk.blue('Restart payload (dry-run):'));
      console.log('');
      console.log(`PUT /experiments/${id}/restart`);
      console.log('');
      if (changes) {
        console.log('Changes from template:');
        console.log(JSON.stringify(changes, null, 2));
      } else {
        console.log('No template changes — restart with current config.');
      }
      return;
    }

    const result = await restartExperiment(client, params, changes);
    const typeNote = options.asType ? ` as ${options.asType}` : '';
    console.log(chalk.green(`Experiment ${id} restarted${typeNote} → new iteration ID: ${result.data.newId}`));
  }));
