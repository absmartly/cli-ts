import { promptSelect, promptText, promptNavigation } from '../prompts.js';
import type { Step, StepResult, EditorContext } from '../types.js';
import type { ExperimentTemplate } from '../../../api-client/template/parser.js';

const ANALYSIS_TYPES = [
  { name: 'Group Sequential', value: 'group_sequential' },
  { name: 'Fixed Horizon', value: 'fixed_horizon' },
  { name: 'Multi-Armed Bandit', value: 'multi_armed_bandit' },
];

export const analysisStep: Step = {
  name: 'Analysis',

  shouldSkip(_template, context): boolean {
    return context.experimentType === 'feature';
  },

  async run(template): Promise<StepResult> {
    const analysisType = await promptSelect(
      'Analysis type',
      ANALYSIS_TYPES,
      template.analysis_type ?? 'group_sequential',
    );

    const alpha = await promptText('Required alpha', template.required_alpha ?? '0.05');
    const power = await promptText('Required power', template.required_power ?? '0.8');
    const baseline = await promptText('Baseline participants', template.baseline_participants ?? '');

    const updated: ExperimentTemplate = {
      ...template,
      analysis_type: analysisType,
      required_alpha: alpha,
      required_power: power,
      baseline_participants: baseline || undefined,
    };
    const action = await promptNavigation('Analysis', false, false);
    return { action, template: updated };
  },
};
