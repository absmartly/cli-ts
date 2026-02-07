import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

export const notesCommand = new Command('notes').description('Experiment notes operations');

const listNotesCommand = new Command('list')
  .description('List all notes for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(listNotesCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const notes = await client.listExperimentNotes(id);

    if (notes.length === 0) {
      console.log(chalk.blue('ℹ No notes found'));
      return;
    }

    printFormatted(notes, globalOptions);
  }));

const createNoteCommand = new Command('create')
  .description('Create a note for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--message <text>', 'note text')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(createNoteCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    await client.createExperimentNote(id, options.message);
    console.log(chalk.green(`✓ Note added to experiment ${id}`));
  }));

notesCommand.addCommand(listNotesCommand);
notesCommand.addCommand(createNoteCommand);
