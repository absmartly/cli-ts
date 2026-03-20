import { Command } from 'commander';
import { writeFileSync } from 'fs';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, withErrorHandling } from '../../lib/utils/api-helper.js';
import { generateTemplateFromClient } from '../../lib/template/generator.js';
import { getDefaultType } from './default-type.js';

export const generateTemplateCommand = new Command('generate-template')
  .aliases(['gen-template', 'template'])
  .description('Generate a sample experiment markdown template')
  .option('--name <name>', 'experiment name for the template', 'My Experiment')
  .option('--type <type>', 'experiment type (test or feature)')
  .option('-o, --output <path>', 'output file path (defaults to stdout)')
  .action(withErrorHandling(async (options) => {
    const globalOptions = getGlobalOptions(generateTemplateCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const content = await generateTemplateFromClient(client, {
      name: options.name,
      type: options.type || getDefaultType(),
    });

    if (options.output) {
      writeFileSync(options.output, content, 'utf8');
      console.log(chalk.green(`✓ Template written to ${options.output}`));
    } else {
      console.log(content);
    }
  }));
