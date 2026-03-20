import { promptSearchSelect, promptJsonEditor, promptNavigation } from '../prompts.js';
import type { Step, StepResult, EditorContext } from '../types.js';
import type { ExperimentTemplate } from '../../../api-client/template/parser.js';

export const audiencesStep: Step = {
  name: 'Audiences',
  async run(template, context): Promise<StepResult> {
    const unitType = await promptSearchSelect(
      'Unit type',
      context.unitTypes,
      template.unit_type,
    );

    const application = await promptSearchSelect(
      'Application',
      context.applications,
      template.application,
    );

    let audience = template.audience ?? '';
    try {
      audience = await promptJsonEditor('Audience filter (JSON)', audience);
    } catch {
      console.log('Keeping current audience value.');
    }

    const updated: ExperimentTemplate = {
      ...template,
      unit_type: unitType,
      application,
      audience: audience.trim() || undefined,
    };
    const action = await promptNavigation('Audiences', false, false);
    return { action, template: updated };
  },
};
