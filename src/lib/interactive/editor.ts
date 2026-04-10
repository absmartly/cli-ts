import chalk from 'chalk';
import type { ExperimentTemplate } from '../../api-client/template/parser.js';
import type { Step, EditorContext } from './types.js';
import { basicsStep } from './steps/basics.js';
import { variantsStep } from './steps/variants.js';
import { audiencesStep } from './steps/audiences.js';
import { metricsStep } from './steps/metrics.js';
import { analysisStep } from './steps/analysis.js';
import { metadataStep } from './steps/metadata.js';
import { reviewStep } from './steps/review.js';

const EMPTY_TEMPLATE: ExperimentTemplate = {
  name: '',
  type: 'test',
  percentages: '50/50',
  variants: [],
  custom_fields: {},
};

export class InteractiveEditor {
  private steps: Step[];
  private context: EditorContext;

  constructor(context: EditorContext) {
    this.context = context;
    this.steps = [
      basicsStep,
      variantsStep,
      audiencesStep,
      metricsStep,
      analysisStep,
      metadataStep,
      reviewStep,
    ].filter((step) => !step.shouldSkip?.(EMPTY_TEMPLATE, context));
  }

  async run(initial: ExperimentTemplate): Promise<ExperimentTemplate | null> {
    let template = { ...initial };
    let stepIndex = 0;

    console.log(chalk.bold('\nInteractive Experiment Editor'));
    console.log(chalk.gray('Navigate: Next/Back/Skip/Review/Cancel\n'));

    while (stepIndex < this.steps.length) {
      const step = this.steps[stepIndex]!;
      console.log(chalk.cyan(`\n-- Step ${stepIndex + 1}/${this.steps.length}: ${step.name} --\n`));

      const result = await step.run(template, this.context);
      template = result.template;

      switch (result.action) {
        case 'next':
          stepIndex++;
          break;
        case 'back':
          stepIndex = Math.max(0, stepIndex - 1);
          break;
        case 'skip':
          stepIndex++;
          break;
        case 'review':
          stepIndex = this.steps.length - 1;
          break;
        case 'cancel':
          console.log(chalk.yellow('\nCancelled.'));
          return null;
      }
    }

    return template;
  }
}
