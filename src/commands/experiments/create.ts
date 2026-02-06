import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
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
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      let data: Partial<Experiment>;

      if (options.fromFile) {
        const template = parseExperimentFile(options.fromFile);
        data = {
          name: template.name,
          display_name: template.display_name,
          type: template.type,
          state: template.state,
          traffic: template.percentage_of_traffic,
          description: template.description || template.hypothesis,
        };

        if (template.variants && template.variants.length > 0) {
          data.variants = template.variants.map((v: VariantTemplate) => ({
            name: v.name,
            config: v.config ? JSON.parse(v.config) : {},
          }));
        }
      } else {
        data = {
          name: options.name,
          display_name: options.displayName || options.name,
          type: options.type || 'test',
          description: options.description || options.hypothesis,
        };

        if (options.variants) {
          const variantNames = options.variants.split(',');
          data.variants = variantNames.map((name: string) => ({
            name: name.trim(),
            config: {},
          }));
        }
      }

      const experiment = await client.createExperiment(data);

      console.log(chalk.green(`✓ Experiment created with ID: ${experiment.id}`));
      console.log(`  Name: ${experiment.name}`);
      console.log(`  Type: ${experiment.type}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
