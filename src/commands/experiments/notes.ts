import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { formatOutput } from '../../lib/output/formatter.js';

export const notesCommand = new Command('notes').description('Experiment notes operations');

const listNotesCommand = new Command('list')
  .description('List all notes for an experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .action(async (id: number) => {
    try {
      const globalOptions = getGlobalOptions(listNotesCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      const notes = await client.listExperimentNotes(id);

      if (notes.length === 0) {
        console.log(chalk.blue('ℹ No notes found'));
        return;
      }

      const output = formatOutput(notes, globalOptions.output as any, {
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

const createNoteCommand = new Command('create')
  .description('Create a note for an experiment')
  .argument('<id>', 'experiment ID', parseInt)
  .requiredOption('--message <text>', 'note text')
  .action(async (id: number, options) => {
    try {
      const globalOptions = getGlobalOptions(createNoteCommand);
      const client = await getAPIClientFromOptions(globalOptions);

      await client.createExperimentNote(id, options.message);

      console.log(chalk.green(`✓ Note added to experiment ${id}`));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

notesCommand.addCommand(listNotesCommand);
notesCommand.addCommand(createNoteCommand);
