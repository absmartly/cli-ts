import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, resolveAPIKey, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { buildExperimentPayload } from '../../api-client/payload/builder.js';
import { resolveScreenshot } from '../../api-client/template/screenshot.js';
import type { Experiment } from '../../lib/api/types.js';

function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export const createCommand = new Command('create')
  .description('Create a new experiment')
  .option('--from-file <path>', 'create from markdown template file')
  .option('--name <name>', 'experiment name')
  .option('--display-name <name>', 'display name')
  .option('--type <type>', 'experiment type (test, feature)')
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

      const [applications, unitTypes, metrics, customSectionFields] = await Promise.all([
        client.listApplications(),
        client.listUnitTypes(),
        client.listMetrics({ archived: true }),
        client.listCustomSectionFields(),
      ]);

      const result = await buildExperimentPayload(template, {
        applications,
        unitTypes,
        metrics,
        goals: [],
        customSectionFields,
      });

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

      const variantNames = options.variants ? options.variants.split(',').map((n: string) => n.trim()) : ['control', 'treatment'];
      const variantConfigs: string[] = options.variantConfig || [];
      const variants = variantNames.map((name: string, index: number) => ({
        name,
        variant: index,
        config: variantConfigs[index] || JSON.stringify({}),
      }));

      const percentages = options.percentages
        ? options.percentages.split(',').map((p: string) => parseInt(p.trim(), 10))
        : variantNames.map(() => Math.floor(100 / variantNames.length));

      data = {
        name: options.name,
        display_name: options.displayName || options.name,
        type: (options.type || 'test') as 'test' | 'feature',
        state: options.state,
        percentages: percentages.join('/'),
        percentage_of_traffic: options.percentageOfTraffic,
        audience: '{"filter":[{"and":[]}]}',
        audience_strict: false,
        analysis_type: 'group_sequential',
        required_alpha: '0.1',
        required_power: '0.8',
        group_sequential_futility_type: 'binding',
        group_sequential_min_analysis_interval: '1d',
        group_sequential_first_analysis_interval: '7d',
        group_sequential_max_duration_interval: '6w',
        baseline_participants_per_day: '33',
        nr_variants: variants.length,
        variants,
        variant_screenshots: [],
        secondary_metrics: [],
        teams: [],
        experiment_tags: [],
      } as any;

      if (options.unitType) {
        (data as any).unit_type = { unit_type_id: options.unitType };
      }
      if (options.applicationId) {
        (data as any).applications = [{ application_id: options.applicationId, application_version: '0' }];
      }
      if (options.primaryMetric) {
        (data as any).primary_metric = { metric_id: options.primaryMetric };
      }
      if (options.screenshot && options.screenshot.length > 0) {
        const screenshots: Array<Record<string, unknown>> = [];
        for (const entry of options.screenshot as string[]) {
          const colonIdx = entry.indexOf(':');
          if (colonIdx === -1) {
            throw new Error(
              `Invalid --screenshot format: "${entry}"\n` +
              `Expected: <variant_index>:<file_path_or_url>\n` +
              `Example: --screenshot 0:./control.png --screenshot 1:https://example.com/treatment.png`
            );
          }
          const variantIdx = parseInt(entry.substring(0, colonIdx), 10);
          const source = entry.substring(colonIdx + 1);
          if (isNaN(variantIdx)) {
            throw new Error(`Invalid variant index in --screenshot: "${entry}"`);
          }
          const variantName = variants[variantIdx]?.name || `variant_${variantIdx}`;
          const resolved = await resolveScreenshot(source, variantName);
          if (resolved) {
            screenshots.push({ variant: variantIdx, file_upload: resolved });
          }
        }
        (data as any).variant_screenshots = screenshots;
      }
    }

    if (options.owner && options.owner.length > 0) {
      (data as any).owners = options.owner.map((id: string) => ({ user_id: parseInt(id, 10) }));
    }

    if (!(data as any).custom_section_field_values) {
      const customFields = await client.listCustomSectionFields();
      const expType = (data as any).type || 'test';
      const allFields = customFields.filter(
        (f: any) => !f.archived && f.custom_section?.type === expType && !f.custom_section?.archived
      );
      if (allFields.length > 0) {
        const ownerId = (data as any).owners?.[0]?.user_id;
        const fieldValues: Record<string, { type: string; value: string }> = {};
        for (const f of allFields) {
          let value = f.default_value ?? '';
          if (f.type === 'user' && ownerId) {
            value = String(ownerId);
          }
          fieldValues[f.id] = { type: f.type, value };
        }
        (data as any).custom_section_field_values = fieldValues;
      }
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
