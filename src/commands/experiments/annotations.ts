import { Command } from 'commander';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  printResult,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import {
  parseAnnotationId,
  parseExperimentId,
  requireAtLeastOneField,
} from '../../lib/utils/validators.js';
import type { AnnotationId, ExperimentId } from '../../lib/api/branded-types.js';
import {
  listAnnotations,
  createAnnotation,
  updateAnnotation,
  archiveAnnotation,
} from '../../core/experiments/annotations.js';

export const annotationsCommand = new Command('annotations').description(
  'Manage experiment annotations'
);

const listCommand = new Command('list')
  .description('List annotations for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .action(
    withErrorHandling(async (experimentId: ExperimentId) => {
      const globalOptions = getGlobalOptions(listCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await listAnnotations(client, { experimentId });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create an annotation for an experiment')
  .argument('<experimentId>', 'experiment ID', parseExperimentId)
  .option('--type <type>', 'annotation type')
  .action(
    withErrorHandling(async (experimentId: ExperimentId, options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await createAnnotation(client, { experimentId, type: options.type });
      const data = result.data as { id?: unknown } | undefined;
      printResult(globalOptions, {
        message: `✓ Annotation created`,
        id: data?.id,
        raw: result.data,
      });
    })
  );

const updateCommand = new Command('update')
  .description('Update an annotation')
  .argument('<annotationId>', 'annotation ID', parseAnnotationId)
  .option('--type <type>', 'annotation type')
  .action(
    withErrorHandling(async (annotationId: AnnotationId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const data: Record<string, unknown> = {};
      if (options.type !== undefined) data.type = options.type;
      requireAtLeastOneField(data, 'update field');
      const result = await updateAnnotation(client, { annotationId, type: options.type });
      printResult(globalOptions, {
        message: `✓ Annotation ${annotationId} updated`,
        id: annotationId,
        raw: result.data,
      });
    })
  );

const archiveCmd = new Command('archive')
  .description('Archive or unarchive an annotation')
  .argument('<annotationId>', 'annotation ID', parseAnnotationId)
  .option('--unarchive', 'unarchive the annotation')
  .action(
    withErrorHandling(async (annotationId: AnnotationId, options) => {
      const globalOptions = getGlobalOptions(archiveCmd);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await archiveAnnotation(client, {
        annotationId,
        unarchive: !!options.unarchive,
      });
      printResult(globalOptions, {
        message: `✓ Annotation ${annotationId} ${result.data.action}`,
        id: annotationId,
        raw: result.data,
      });
    })
  );

annotationsCommand.addCommand(listCommand);
annotationsCommand.addCommand(createCommand);
annotationsCommand.addCommand(updateCommand);
annotationsCommand.addCommand(archiveCmd);
