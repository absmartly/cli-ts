import { promptText, promptNumber, promptNavigation } from '../prompts.js';
import type { Step, StepResult } from '../types.js';
import type { ExperimentTemplate } from '../../../api-client/template/parser.js';

export const basicsStep: Step = {
  name: 'Basics',
  async run(template): Promise<StepResult> {
    const name = await promptText('Experiment name', template.name);
    const displayName = await promptText('Display name', template.display_name ?? name);
    const traffic = await promptNumber('Traffic %', template.percentage_of_traffic ?? 100);
    const percentages = await promptText(
      'Variant split (e.g. 50/50)',
      template.percentages ?? '50/50'
    );

    const updated: ExperimentTemplate = {
      ...template,
      name,
      display_name: displayName,
      percentage_of_traffic: traffic,
      percentages,
    };
    const action = await promptNavigation('Basics', true, false);
    return { action, template: updated };
  },
};
