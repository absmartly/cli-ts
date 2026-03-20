import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { buildExperimentPayload } from '../../api-client/payload/builder.js';
import { parseExperimentId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { ExperimentInput } from '../../api-client/index.js';
import { resolveBySearch } from '../../api-client/payload/search-resolver.js';

export const updateCommand = new Command('update')
  .description('Update an existing experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--from-file <path>', 'update from markdown template file')
  .option('--display-name <name>', 'new display name')
  .option('--traffic <percent>', 'traffic allocation percentage', parseInt)
  .option('--dry-run', 'show the request payload without making the API call')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let data: Record<string, unknown>;

    if (options.fromFile) {
      const template = parseExperimentFile(options.fromFile);

      const metricNames = [
        template.primary_metric,
        ...(template.secondary_metrics ?? []),
        ...(template.guardrail_metrics ?? []),
        ...(template.exploratory_metrics ?? []),
      ].filter(Boolean) as string[];

      const ownerRefs = template.owners ?? [];

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
        template.teams?.length ? client.listTeams() : Promise.resolve([]),
        template.tags?.length ? client.listExperimentTags() : Promise.resolve([]),
      ]);

      const result = await buildExperimentPayload(template, {
        applications,
        unitTypes,
        metrics,
        goals: [],
        customSectionFields,
        users,
        teams,
        experimentTags,
      });

      for (const warning of result.warnings) {
        console.log(chalk.yellow(`⚠ ${warning}`));
      }

      data = result.payload as Record<string, unknown>;
    } else {
      data = {};
      if (options.displayName !== undefined) data.display_name = options.displayName;
      if (options.traffic !== undefined) data.percentage_of_traffic = options.traffic;
    }

    requireAtLeastOneField(data, 'update field');

    if (options.dryRun) {
      console.log(chalk.blue('Request Payload (dry-run):'));
      console.log('');
      console.log(`PUT /experiments/${id}`);
      console.log('');
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    await client.updateExperiment(id, data as Partial<ExperimentInput>);
    console.log(chalk.green(`Experiment ${id} updated`));
  }));
