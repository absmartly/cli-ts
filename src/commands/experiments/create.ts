import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentFile, type VariantTemplate } from '../../lib/template/parser.js';
import type { Experiment } from '../../lib/api/types.js';

export const createCommand = new Command('create')
  .description('Create a new experiment')
  .option('--from-file <path>', 'create from markdown template file')
  .option('--name <name>', 'experiment name')
  .option('--display-name <name>', 'display name')
  .option('--type <type>', 'experiment type (test, feature)')
  .option('--variants <names>', 'comma-separated variant names')
  .option('--app <name>', 'application name')
  .option('--env <name>', 'environment name')
  .option('--description <text>', 'experiment description')
  .option('--hypothesis <text>', 'experiment hypothesis')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    let data: Partial<Experiment>;

    if (options.fromFile) {
      const template = parseExperimentFile(options.fromFile);
      data = {
        name: template.name,
        display_name: template.display_name,
        type: template.type as 'test' | 'feature',
        state: template.state as 'archived' | 'created' | 'ready' | 'running' | 'development' | 'full_on' | 'stopped' | 'scheduled',
        traffic: template.percentage_of_traffic,
      } as Partial<Experiment>;

      if (template.variants && template.variants.length > 0) {
        data.variants = template.variants.map((v: VariantTemplate, index: number) => {
          let parsedConfig = {};
          if (v.config) {
            try {
              parsedConfig = JSON.parse(v.config);
            } catch (error) {
              throw new Error(
                `Invalid JSON in variant "${v.name}" (variant ${index}):\n` +
                `${error instanceof Error ? error.message : 'unknown error'}\n` +
                `Config: ${v.config.substring(0, 100)}${v.config.length > 100 ? '...' : ''}`
              );
            }
          }
          return {
            name: v.name,
            variant: index,
            config: JSON.stringify(parsedConfig),
          };
        });
      }
    } else {
      if (!options.name) {
        throw new Error(
          'Missing required option: --name\n' +
          'Either provide --name or use --from-file with a template.'
        );
      }

      data = {
        name: options.name,
        display_name: options.displayName || options.name,
        type: (options.type || 'test') as 'test' | 'feature',
      } as Partial<Experiment>;

      if (options.variants) {
        data.variants = options.variants.split(',').map((name: string, index: number) => ({
          name: name.trim(),
          variant: index,
          config: JSON.stringify({}),
        }));
      }
    }

    const experiment = await client.createExperiment(data);

    console.log(chalk.green(`✓ Experiment created with ID: ${experiment.id}`));
    console.log(`  Name: ${experiment.name}`);
    console.log(`  Type: ${experiment.type}`);
  }));
