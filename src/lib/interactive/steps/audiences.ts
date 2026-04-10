import { promptSearchSelect, promptJsonEditor, promptNavigation } from '../prompts.js';
import type { Step, StepResult } from '../types.js';
import type { ExperimentTemplate } from '../../../api-client/template/parser.js';

export const audiencesStep: Step = {
  name: 'Audiences',
  async run(template, context): Promise<StepResult> {
    const unitType = await promptSearchSelect('Unit type', context.unitTypes, template.unit_type);

    const application = await promptSearchSelect(
      'Application',
      context.applications,
      template.application
    );

    let audience = template.audience ?? '';
    try {
      audience = await promptJsonEditor('Audience filter (JSON)', audience);
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError')
        throw error;
      console.log('Keeping current audience value.');
    }

    const updated: ExperimentTemplate = {
      ...template,
      unit_type: unitType,
      application,
    };
    if (audience.trim()) {
      updated.audience = audience.trim();
    }
    const action = await promptNavigation('Audiences', false, false);
    return { action, template: updated };
  },
};
