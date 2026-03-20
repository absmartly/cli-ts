import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, resolveAPIKey, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { buildPayloadFromOptions } from '../../api-client/payload/build-from-options.js';
import type { Experiment } from '../../lib/api/types.js';
import { getDefaultType } from './default-type.js';

function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export const createCommand = new Command('create')
  .description('Create a new experiment')
  .option('--from-file <path>', 'create from markdown template file')
  .option('--name <name>', 'experiment name')
  .option('--display-name <name>', 'display name')
  .option('--state <state>', 'initial state (created, ready, running)', 'ready')
  .option('--variants <names>', 'comma-separated variant names')
  .option('--variant-config <json...>', 'variant config JSON (one per variant, in order)')
  .option('--application-id <id>', 'application ID', parseInt)
  .option('--unit-type <id>', 'unit type ID', parseInt)
  .option('--primary-metric <id>', 'primary metric ID', parseInt)
  .option('--percentages <values>', 'comma-separated traffic split per variant (e.g. 50,50)')
  .option('--percentage-of-traffic <pct>', 'percentage of total traffic (0-100)', parseInt, 100)
  .option('--env <name>', 'environment name')
  .option('--owner <user_id>', 'owner user ID (can specify multiple)', (val: string, prev: string[]) => [...prev, val], [] as string[])
  .option('--screenshot <variant:source...>', 'variant screenshot (variant_index:path_or_url, can specify multiple)')
  .option('--dry-run', 'show the request payload without making the API call')
  .option('--as-curl', 'output as curl command instead of making the API call')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let data: Partial<Experiment>;

    if (options.fromFile) {
      const template = parseExperimentFile(options.fromFile);
      const result = await buildPayloadFromTemplate(client, template, getDefaultType());
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`⚠ ${warning}`));
      }
      data = result.payload as Partial<Experiment>;
    } else {
      if (!options.name) {
        throw new Error(
          'Missing required option: --name\n' +
          'Either provide --name or use --from-file with a template.'
        );
      }
      const ownerIds = options.owner?.map((id: string) => parseInt(id, 10));
      data = await buildPayloadFromOptions({
        name: options.name,
        displayName: options.displayName,
        type: getDefaultType(),
        state: options.state,
        variants: options.variants,
        variantConfig: options.variantConfig,
        percentages: options.percentages,
        percentageOfTraffic: options.percentageOfTraffic,
        unitType: options.unitType,
        applicationId: options.applicationId,
        primaryMetric: options.primaryMetric,
        screenshot: options.screenshot,
        ownerIds,
      }, client);
    }

    if (options.dryRun) {
      console.log(chalk.blue('📋 Request Payload (dry-run):'));
      console.log('');
      console.log('POST /experiments');
      console.log('');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      return;
    }

    if (options.asCurl) {
      const endpoint = globalOptions.endpoint || process.env.ABSMARTLY_API_ENDPOINT || 'https://demo-2.absmartly.com/v1';
      const apiKey = await resolveAPIKey(globalOptions);

      console.log(chalk.blue('cURL Command:'));
      console.log('');
      console.log(`curl -X POST ${shellEscape(endpoint + '/experiments')} \\`);
      console.log(`  -H ${shellEscape('Authorization: Api-Key ' + apiKey)} \\`);
      console.log(`  -H 'Content-Type: application/json' \\`);
      console.log(`  -H 'Accept: application/json' \\`);
      console.log(`  -d ${shellEscape(JSON.stringify(data))}`);
      console.log('');
      console.log(chalk.yellow('Tip: Pipe to jq for formatted output:'));
      console.log(`  ... | jq`);
      console.log('');
      return;
    }

    const experiment = await client.createExperiment(data);

    console.log(chalk.green(`✓ Experiment created with ID: ${experiment.id}`));
    console.log(`  Name: ${experiment.name}`);
    console.log(`  Type: ${experiment.type}`);
  }));
