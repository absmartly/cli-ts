import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseAnnotationId, parseExperimentId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { AnnotationId, ExperimentId } from '../../lib/api/branded-types.js';
import { listAnnotations, createAnnotation, updateAnnotation, archiveAnnotation } from '../../core/experiments/annotations.js';

export const annotationsCommand = new Command('annotations')
  .description('Manage experiment annotations');

const listCommand = new Command('list')
  .description('List annotations for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (experimentId: ExperimentId) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await listAnnotations(client, { experimentId });
    printFormatted(result.data, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create an annotation for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .option('--type <type>', 'annotation type')
  .action(withErrorHandling(async (experimentId: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await createAnnotation(client, { experimentId, type: options.type });
    console.log(chalk.green(`✓ Annotation created`));
    printFormatted(result.data, globalOptions);
  }));

const updateCommand = new Command('update')
  .description('Update an annotation')
  .argument('<annotationId>', 'annotation ID', parseAnnotationId)
  .option('--type <type>', 'annotation type')
  .action(withErrorHandling(async (annotationId: AnnotationId, options) => {
    const globalOptions = getGlobalOptions(updateCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const data: Record<string, unknown> = {};
    if (options.type !== undefined) data.type = options.type;
    requireAtLeastOneField(data, 'update field');
    const result = await updateAnnotation(client, { annotationId, type: options.type });
    console.log(chalk.green(`✓ Annotation ${annotationId} updated`));
    printFormatted(result.data, globalOptions);
  }));

const archiveCmd = new Command('archive')
  .description('Archive or unarchive an annotation')
  .argument('<annotationId>', 'annotation ID', parseAnnotationId)
  .option('--unarchive', 'unarchive the annotation')
  .action(withErrorHandling(async (annotationId: AnnotationId, options) => {
    const globalOptions = getGlobalOptions(archiveCmd);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await archiveAnnotation(client, { annotationId, unarchive: !!options.unarchive });
    console.log(chalk.green(`✓ Annotation ${annotationId} ${result.data.action}`));
  }));

annotationsCommand.addCommand(listCommand);
annotationsCommand.addCommand(createCommand);
annotationsCommand.addCommand(updateCommand);
annotationsCommand.addCommand(archiveCmd);
