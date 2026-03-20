import { Command } from 'commander';
import { readFileSync } from 'fs';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, resolveEndpoint, resolveAPIKey, withErrorHandling } from '../../lib/utils/api-helper.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { buildPayloadFromTemplate } from '../../api-client/template/build-from-template.js';
import { mergeTemplateOverrides } from '../../api-client/template/merge-overrides.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import { runInteractiveEditor } from '../../lib/interactive/run.js';
import { getDefaultType } from './default-type.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import type { Experiment } from '../../lib/api/types.js';

export const cloneCommand = new Command('clone')
  .description('Clone an experiment or feature flag')
  .argument('<id>', 'experiment ID to clone', parseExperimentId)
  .option('--name <name>', 'name for the cloned experiment (required)')
  .option('--display-name <name>', 'display name for the clone')
  .option('--state <state>', 'initial state (created, ready)', 'created')
  .option('--from-file <path>', 'apply template overrides before cloning')
  .option('-i, --interactive', 'interactive step-by-step editor')
  .option('--dry-run', 'show the payload without creating')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    if (!options.name && !options.interactive) {
      throw new Error(
        `--name is required for clone.\n` +
        `Example: abs experiments clone ${id} --name my_cloned_experiment`
      );
    }

    const globalOptions = getGlobalOptions(cloneCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const experiment = await client.getExperiment(id);
    const hasScreenshots = (experiment as any).variant_screenshots?.length > 0;
    const md = await experimentToMarkdown(experiment, {
      apiEndpoint: resolveEndpoint(globalOptions),
      ...(hasScreenshots && {
        apiKey: await resolveAPIKey(globalOptions),
        screenshotsDir: '.screenshots',
      }),
    });

    let template = parseExperimentMarkdown(md);

    if (options.fromFile) {
      const overrideTemplate = parseExperimentMarkdown(
        readFileSync(options.fromFile === '-' ? '/dev/stdin' : options.fromFile, 'utf8')
      );
      template = mergeTemplateOverrides(template, overrideTemplate);
    }

    if (options.name) template.name = options.name;
    if (options.displayName) template.display_name = options.displayName;
    template.state = options.state;

    if (options.interactive) {
      const edited = await runInteractiveEditor(client, template, getDefaultType());
      if (!edited) return;
      template = edited;
    }

    const result = await buildPayloadFromTemplate(client, template, getDefaultType());

    for (const warning of result.warnings) {
      console.log(chalk.yellow(`⚠ ${warning}`));
    }

    const data = result.payload as Partial<Experiment>;

    if (options.dryRun) {
      console.log(chalk.blue('Clone payload (dry-run):'));
      console.log('');
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const created = await client.createExperiment(data);
    console.log(chalk.green(`Experiment ${id} cloned → new ID: ${created.id}`));
    console.log(`  Name: ${created.name}`);
    console.log(`  Type: ${created.type}`);
  }));
