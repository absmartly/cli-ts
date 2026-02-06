import { Command } from 'commander';
import { writeFileSync } from 'fs';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { generateTemplate } from '../../lib/template/generator.js';

export const generateTemplateCommand = new Command('generate-template')
  .aliases(['gen-template', 'template'])
  .description('Generate a sample experiment markdown template')
  .option('--name <name>', 'experiment name for the template', 'My Experiment')
  .option('--type <type>', 'experiment type (test or feature)', 'test')
  .option('-o, --output <path>', 'output file path (defaults to stdout)')
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(generateTemplateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const content = await generateTemplate(client, {
        name: options.name,
        type: options.type,
      });

      if (options.output) {
        writeFileSync(options.output, content, 'utf8');
        console.log(chalk.green(`✓ Template written to ${options.output}`));
      } else {
        console.log(content);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
