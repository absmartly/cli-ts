import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, resolveAPIKey, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { buildPayloadFromOptions } from '../../api-client/payload/build-from-options.js';
import { runInteractiveEditor } from '../../lib/interactive/run.js';

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
  .option('--secondary-metrics <names>', 'comma-separated secondary metric names or IDs')
  .option('--guardrail-metrics <names>', 'comma-separated guardrail metric names or IDs')
  .option('--exploratory-metrics <names>', 'comma-separated exploratory metric names or IDs')
  .option('--teams <names>', 'comma-separated team names or IDs')
  .option('--tags <names>', 'comma-separated tag names or IDs')
  .option('--audience <json>', 'audience filter JSON')
  .option('--analysis-type <type>', 'analysis type (group_sequential, fixed_horizon)')
  .option('--required-alpha <value>', 'required alpha (significance level)')
  .option('--required-power <value>', 'required power')
  .option('--baseline-participants <n>', 'baseline participants per day')
  .option('-i, --interactive', 'interactive step-by-step editor')
  .option('--dry-run', 'show the request payload without making the API call')
  .option('--as-curl', 'output as curl command instead of making the API call')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let data: Record<string, unknown>;

    if (options.interactive) {
      const base = options.fromFile
        ? parseExperimentFile(options.fromFile)
        : { type: getDefaultType(), percentages: '50/50', variants: [], custom_fields: {} };
      const edited = await runInteractiveEditor(client, base, getDefaultType());
      if (!edited) return;
      const result = await buildPayloadFromTemplate(client, edited, getDefaultType());
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`Warning: ${warning}`));
      }
      data = result.payload;
    } else if (options.fromFile) {
      const template = parseExperimentFile(options.fromFile);
      const result = await buildPayloadFromTemplate(client, template, getDefaultType());
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`⚠ ${warning}`));
      }
      data = result.payload;
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
        secondaryMetrics: options.secondaryMetrics,
        guardrailMetrics: options.guardrailMetrics,
        exploratoryMetrics: options.exploratoryMetrics,
        teams: options.teams,
        tags: options.tags,
        audience: options.audience,
        analysisType: options.analysisType,
        requiredAlpha: options.requiredAlpha,
        requiredPower: options.requiredPower,
        baselineParticipants: options.baselineParticipants,
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
