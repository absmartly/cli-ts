import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { buildExperimentPayload } from '../../api-client/payload/builder.js';
import { resolveBySearch } from '../../api-client/payload/search-resolver.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { ExperimentInput } from '../../api-client/index.js';
import { getDefaultType } from './default-type.js';

const VALID_REASONS = [
  'hypothesis_rejected', 'hypothesis_iteration', 'user_feedback', 'data_issue',
  'implementation_issue', 'experiment_setup_issue', 'guardrail_metric_impact',
  'secondary_metric_impact', 'operational_decision', 'performance_issue',
  'testing', 'tracking_issue', 'code_cleaned_up', 'other',
] as const;

const VALID_RESTART_TYPES = ['feature', 'experiment'] as const;

export const restartCommand = new Command('restart')
  .description('Restart a stopped experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--from-file <path>', 'apply template changes before restarting')
  .option('--note <text>', 'note about the restart', 'Restarted via CLI')
  .option('--reason <reason>', `reason for restart (${VALID_REASONS.join(', ')})`)
  .option('--reshuffle', 'reshuffle variant assignments')
  .option('--state <state>', 'target state: running or development', 'running')
  .option('--as-type <type>', `convert type on restart (${VALID_RESTART_TYPES.join(', ')})`)
  .option('--dry-run', 'show the changes without restarting')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(restartCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    if (options.reason && !VALID_REASONS.includes(options.reason)) {
      throw new Error(
        `Invalid reason: "${options.reason}"\n` +
        `Valid reasons: ${VALID_REASONS.join(', ')}`
      );
    }

    if (options.state && !['running', 'development'].includes(options.state)) {
      throw new Error(
        `Invalid state: "${options.state}"\n` +
        `Valid states: running, development`
      );
    }

    if (options.asType && !VALID_RESTART_TYPES.includes(options.asType)) {
      throw new Error(
        `Invalid type: "${options.asType}"\n` +
        `Valid types: ${VALID_RESTART_TYPES.join(', ')}`
      );
    }

    let changes: Partial<ExperimentInput> | undefined;

    if (options.fromFile) {
      const newTemplate = parseExperimentFile(options.fromFile);

      const metricNames = [
        newTemplate.primary_metric,
        ...(newTemplate.secondary_metrics ?? []),
        ...(newTemplate.guardrail_metrics ?? []),
        ...(newTemplate.exploratory_metrics ?? []),
      ].filter(Boolean) as string[];

      const ownerRefs = newTemplate.owners ?? [];

      const [applications, unitTypes, customSectionFields, metrics, users, teams, experimentTags] = await Promise.all([
        client.listApplications(),
        client.listUnitTypes(),
        client.listCustomSectionFields(),
        metricNames.length > 0
          ? resolveBySearch(metricNames, name => client.listMetrics({ search: name, archived: true }))
          : Promise.resolve([]),
        ownerRefs.length > 0
          ? resolveBySearch(ownerRefs, ref => client.listUsers({ search: ref }))
          : Promise.resolve([]),
        newTemplate.teams?.length ? client.listTeams() : Promise.resolve([]),
        newTemplate.tags?.length ? client.listExperimentTags() : Promise.resolve([]),
      ]);

      const result = await buildExperimentPayload(newTemplate, {
        applications,
        unitTypes,
        metrics,
        goals: [],
        customSectionFields,
        users,
        teams,
        experimentTags,
      }, options.asType || getDefaultType());

      for (const warning of result.warnings) {
        console.log(chalk.yellow(`⚠ ${warning}`));
      }

      changes = result.payload as Partial<ExperimentInput>;
    }

    const restartOptions: Parameters<typeof client.restartExperiment>[1] = { note: options.note };
    if (options.reason) restartOptions.reason = options.reason;
    if (options.reshuffle) restartOptions.reshuffle = true;
    if (options.state) restartOptions.state = options.state;
    if (options.asType) restartOptions.restart_as_type = options.asType;
    if (changes) restartOptions.changes = changes;

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

    const newExperiment = await client.restartExperiment(id, restartOptions);
    const typeNote = options.asType ? ` as ${options.asType}` : '';
    console.log(chalk.green(`Experiment ${id} restarted${typeNote} → new iteration ID: ${newExperiment.id}`));
  }));
