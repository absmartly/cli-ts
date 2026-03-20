import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { buildSecondaryMetrics } from '../../api-client/payload/metrics-builder.js';
import { parseCSV } from '../../api-client/payload/parse-csv.js';
import { runInteractiveEditor } from '../../lib/interactive/run.js';
import { resolveScreenshot } from '../../api-client/template/screenshot.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { ExperimentInput } from '../../api-client/index.js';
import { getDefaultType } from './default-type.js';

export const updateCommand = new Command('update')
  .description('Update an existing experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--from-file <path>', 'update from markdown template file')
  .option('--name <name>', 'experiment name')
  .option('--display-name <name>', 'new display name')
  .option('--state <state>', 'experiment state (created, ready, running)')
  .option('--variants <names>', 'comma-separated variant names')
  .option('--variant-config <json...>', 'variant config JSON (one per variant, in order)')
  .option('--application-id <id>', 'application ID', parseInt)
  .option('--unit-type <id>', 'unit type ID', parseInt)
  .option('--primary-metric <id>', 'primary metric ID', parseInt)
  .option('--secondary-metrics <names>', 'comma-separated secondary metric names or IDs')
  .option('--guardrail-metrics <names>', 'comma-separated guardrail metric names or IDs')
  .option('--exploratory-metrics <names>', 'comma-separated exploratory metric names or IDs')
  .option('--percentages <values>', 'comma-separated traffic split per variant (e.g. 50,50)')
  .option('--percentage-of-traffic <pct>', 'percentage of total traffic (0-100)', parseInt)
  .option('--owner <user_id>', 'owner user ID (can specify multiple)', (val: string, prev: string[]) => [...prev, val], [] as string[])
  .option('--screenshot <variant:source...>', 'variant screenshot (variant_index:path_or_url, can specify multiple)')
  .option('--screenshot-id <variant:upload_id...>', 'variant screenshot by existing file upload ID (variant_index:upload_id, can specify multiple)')
  .option('--teams <names>', 'comma-separated team names or IDs')
  .option('--tags <names>', 'comma-separated tag names or IDs')
  .option('--audience <json>', 'audience filter JSON')
  .option('--analysis-type <type>', 'analysis type (group_sequential, fixed_horizon)')
  .option('--required-alpha <value>', 'required alpha (significance level)')
  .option('--required-power <value>', 'required power')
  .option('--baseline-participants <n>', 'baseline participants per day')
  .option('-i, --interactive', 'interactive step-by-step editor')
  .option('--dry-run', 'show the request payload without making the API call')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const changes: Partial<ExperimentInput> & Record<string, unknown> = {};

    if (options.name !== undefined) changes.name = options.name;
    if (options.displayName !== undefined) changes.display_name = options.displayName;
    if (options.state !== undefined) changes.state = options.state;
    if (options.percentageOfTraffic !== undefined) changes.percentage_of_traffic = options.percentageOfTraffic;
    if (options.percentages) changes.percentages = options.percentages.split(',').map((p: string) => parseInt(p.trim(), 10)).join('/');
    if (options.analysisType) changes.analysis_type = options.analysisType;
    if (options.requiredAlpha) changes.required_alpha = options.requiredAlpha;
    if (options.requiredPower) changes.required_power = options.requiredPower;
    if (options.baselineParticipants) changes.baseline_participants_per_day = options.baselineParticipants;
    if (options.audience) changes.audience = options.audience;

    if (options.primaryMetric) changes.primary_metric = { metric_id: options.primaryMetric };
    if (options.unitType) changes.unit_type = { unit_type_id: options.unitType };
    if (options.applicationId) changes.applications = [{ application_id: options.applicationId, application_version: '0' }];

    if (options.owner?.length) changes.owners = options.owner.map((uid: string) => ({ user_id: parseInt(uid, 10) }));

    if (options.variants) {
      const names = options.variants.split(',').map((n: string) => n.trim());
      const configs: string[] = options.variantConfig || [];
      changes.variants = names.map((name: string, i: number) => ({ name, variant: i, config: configs[i] || '{}' }));
      changes.nr_variants = names.length;
    }

    if (options.secondaryMetrics || options.guardrailMetrics || options.exploratoryMetrics) {
      const allNames = [
        ...parseCSV(options.secondaryMetrics),
        ...parseCSV(options.guardrailMetrics),
        ...parseCSV(options.exploratoryMetrics),
      ];
      const resolved = await client.resolveMetrics(allNames);
      const byName = new Map(allNames.map((name, i) => [name, resolved[i]!]));

      changes.secondary_metrics = buildSecondaryMetrics({
        secondary: parseCSV(options.secondaryMetrics).map(n => byName.get(n)!),
        guardrail: parseCSV(options.guardrailMetrics).map(n => byName.get(n)!),
        exploratory: parseCSV(options.exploratoryMetrics).map(n => byName.get(n)!),
      });
    }

    if (options.teams) {
      const resolved = await client.resolveTeams(parseCSV(options.teams));
      changes.teams = resolved.map(t => ({ team_id: t.id }));
    }

    if (options.tags) {
      const resolved = await client.resolveTags(parseCSV(options.tags));
      changes.experiment_tags = resolved.map(t => ({ experiment_tag_id: t.id }));
    }

    if (options.screenshot?.length || options.screenshotId?.length) {
      const screenshotEntries: Array<{ variant: number; screenshot_file_upload_id: number }> = [];

      if (options.screenshotId?.length) {
        for (const entry of options.screenshotId as string[]) {
          const colonIdx = entry.indexOf(':');
          if (colonIdx === -1) throw new Error(`Invalid --screenshot-id format: "${entry}". Expected: <variant_index>:<upload_id>`);
          const variantIdx = parseInt(entry.substring(0, colonIdx), 10);
          const uploadId = parseInt(entry.substring(colonIdx + 1), 10);
          if (isNaN(variantIdx) || isNaN(uploadId)) throw new Error(`Invalid variant index or upload ID in --screenshot-id: "${entry}"`);
          screenshotEntries.push({ variant: variantIdx, screenshot_file_upload_id: uploadId });
        }
      }

      if (options.screenshot?.length) {
        for (const entry of options.screenshot as string[]) {
          const colonIdx = entry.indexOf(':');
          if (colonIdx === -1) throw new Error(`Invalid --screenshot format: "${entry}". Expected: <variant_index>:<file_path_or_url>`);
          const variantIdx = parseInt(entry.substring(0, colonIdx), 10);
          const source = entry.substring(colonIdx + 1);
          if (isNaN(variantIdx)) throw new Error(`Invalid variant index in --screenshot: "${entry}"`);
          const resolved = await resolveScreenshot(source, `variant_${variantIdx}`);
          if (resolved) screenshotEntries.push({ variant: variantIdx, ...resolved } as any);
        }
      }

      changes.variant_screenshots = screenshotEntries as ExperimentInput['variant_screenshots'];
    }

    if (options.fromFile) {
      const template = parseExperimentFile(options.fromFile);
      const resolved = await buildPayloadFromTemplate(client, template, getDefaultType());
      for (const warning of resolved.warnings) console.log(chalk.yellow(`⚠ ${warning}`));
      for (const [key, value] of Object.entries(resolved.payload)) {
        changes[key] = value;
      }
    }

    if (options.interactive) {
      const experiment = await client.getExperiment(id);
      const md = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(md);
      const edited = await runInteractiveEditor(client, template, getDefaultType());
      if (!edited) return;
      const resolved = await buildPayloadFromTemplate(client, edited, getDefaultType());
      for (const warning of resolved.warnings) console.log(chalk.yellow(`⚠ ${warning}`));
      for (const [key, value] of Object.entries(resolved.payload)) {
        changes[key] = value;
      }
    }

    if (options.dryRun) {
      console.log(chalk.blue('Request Payload (dry-run):'));
      console.log('');
      console.log(`PUT /experiments/${id}`);
      console.log('');
      console.log(JSON.stringify(changes, null, 2));
      return;
    }

    await client.updateExperiment(id, changes);
    console.log(chalk.green(`Experiment ${id} updated`));
  }));
