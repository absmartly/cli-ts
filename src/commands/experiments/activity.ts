import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseExperimentId, parseNoteId } from '../../lib/utils/validators.js';
import type { ExperimentId, NoteId } from '../../lib/api/branded-types.js';

export const activityCommand = new Command('activity').description('Activity operations');

const listActivityCommand = new Command('list')
  .description('List all activity notes for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (id: ExperimentId) => {
    const globalOptions = getGlobalOptions(listActivityCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const notes = await client.listExperimentActivity(id);

    if (notes.length === 0) {
      console.log(chalk.blue('ℹ No activity found'));
      return;
    }

    printFormatted(notes, globalOptions);
  }));

const createActivityCommand = new Command('create')
  .description('Create a new activity note for an experiment')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .requiredOption('--note <text>', 'note text')
  .action(withErrorHandling(async (id: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(createActivityCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const note = await client.createExperimentNote(id, options.note);
    printFormatted(note, globalOptions);
  }));

const editActivityCommand = new Command('edit')
  .description('Edit an existing activity note')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<noteId>', 'note ID', parseNoteId)
  .requiredOption('--note <text>', 'updated note text')
  .action(withErrorHandling(async (experimentId: ExperimentId, noteId: NoteId, options) => {
    const globalOptions = getGlobalOptions(editActivityCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const note = await client.editExperimentNote(experimentId, noteId, options.note);
    printFormatted(note, globalOptions);
  }));

const replyActivityCommand = new Command('reply')
  .description('Reply to an existing activity note')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .argument('<noteId>', 'note ID', parseNoteId)
  .requiredOption('--note <text>', 'reply text')
  .action(withErrorHandling(async (experimentId: ExperimentId, noteId: NoteId, options) => {
    const globalOptions = getGlobalOptions(replyActivityCommand);
    const client = await getAPIClientFromOptions(globalOptions);

    const note = await client.replyToExperimentNote(experimentId, noteId, options.note);
    printFormatted(note, globalOptions);
  }));

activityCommand.addCommand(listActivityCommand);
activityCommand.addCommand(createActivityCommand);
activityCommand.addCommand(editActivityCommand);
activityCommand.addCommand(replyActivityCommand);
