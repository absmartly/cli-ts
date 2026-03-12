import { Command } from 'commander';
import chalk from 'chalk';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling } from '../../lib/utils/api-helper.js';
import { parseAnnotationId, parseExperimentId, requireAtLeastOneField } from '../../lib/utils/validators.js';
import type { AnnotationId, ExperimentId } from '../../lib/api/branded-types.js';

export const annotationsCommand = new Command('annotations')
  .description('Manage experiment annotations');

const listCommand = new Command('list')
  .description('List annotations for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .action(withErrorHandling(async (experimentId: ExperimentId) => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const annotations = await client.listAnnotations(experimentId);
    printFormatted(annotations, globalOptions);
  }));

const createCommand = new Command('create')
  .description('Create an annotation for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .option('--type <type>', 'annotation type')
  .action(withErrorHandling(async (experimentId: ExperimentId, options) => {
    const globalOptions = getGlobalOptions(createCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const data: { experiment_id: number; type?: string } = { experiment_id: experimentId };
    if (options.type !== undefined) data.type = options.type;
    const annotation = await client.createAnnotation(data);
    console.log(chalk.green(`✓ Annotation created`));
    printFormatted(annotation, globalOptions);
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
    const annotation = await client.updateAnnotation(annotationId, data);
    console.log(chalk.green(`✓ Annotation ${annotationId} updated`));
    printFormatted(annotation, globalOptions);
  }));

const archiveCommand = new Command('archive')
  .description('Archive or unarchive an annotation')
  .argument('<annotationId>', 'annotation ID', parseAnnotationId)
  .option('--unarchive', 'unarchive the annotation')
  .action(withErrorHandling(async (annotationId: AnnotationId, options) => {
    const globalOptions = getGlobalOptions(archiveCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    await client.archiveAnnotation(annotationId, !!options.unarchive);
    const action = options.unarchive ? 'unarchived' : 'archived';
    console.log(chalk.green(`✓ Annotation ${annotationId} ${action}`));
  }));

annotationsCommand.addCommand(listCommand);
annotationsCommand.addCommand(createCommand);
annotationsCommand.addCommand(updateCommand);
annotationsCommand.addCommand(archiveCommand);
