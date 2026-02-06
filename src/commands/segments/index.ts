import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const segmentsCommand = new Command('segments')
  .alias('segment')
  .description('Segment commands');

const listCommand = new Command('list')
  .description('List all segments')
  .option('--limit <number>', 'maximum number of results', parseInt, 100)
  .option('--offset <number>', 'offset for pagination', parseInt, 0)
  .action(async (options) => {
    try {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const segments = await client.listSegments(options.limit, options.offset);

      const output = formatOutput(segments, globalOptions.output, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const getCommand = new Command('get')
  .description('Get segment details')
  .argument('<id>', 'segment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const segment = await client.getSegment(id);

      const output = formatOutput(segment, globalOptions.output, {
        noColor: globalOptions.noColor,
        full: globalOptions.full,
        terse: globalOptions.terse,
      });

      console.log(output);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const createCommand = new Command('create')
  .description('Create a new segment')
  .argument('<name>', 'segment name')
  .requiredOption('--attribute <attr>', 'value source attribute name')
  .option('--description <text>', 'segment description')
  .action(async (name: string, options) => {
    try {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data = {
        name,
        value_source_attribute: options.attribute,
        description: options.description,
      };

      const segment = await client.createSegment(data);

      console.log(chalk.green(`✓ Segment created with ID: ${segment.id}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const updateCommand = new Command('update')
  .description('Update a segment')
  .argument('<id>', 'segment ID', parseInt)
  .option('--display-name <name>', 'new display name')
  .option('--description <text>', 'new description')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const data: Record<string, string> = {};
      if (options.displayName) data.display_name = options.displayName;
      if (options.description) data.description = options.description;

      await client.updateSegment(id, data);

      console.log(chalk.green(`✓ Segment ${id} updated`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const deleteCommand = new Command('delete')
  .description('Delete a segment')
  .argument('<id>', 'segment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.deleteSegment(id);

      console.log(chalk.green(`✓ Segment ${id} deleted`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

segmentsCommand.addCommand(listCommand);
segmentsCommand.addCommand(getCommand);
segmentsCommand.addCommand(createCommand);
segmentsCommand.addCommand(updateCommand);
segmentsCommand.addCommand(deleteCommand);
