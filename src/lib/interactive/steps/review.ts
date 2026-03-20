import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Step, StepResult, StepAction } from '../types.js';
import type { ExperimentTemplate } from '../../../api-client/template/parser.js';

export const reviewStep: Step = {
  name: 'Review',
  async run(template): Promise<StepResult> {
    console.log(chalk.bold('\n=== Review ===\n'));
    console.log(`  Name:            ${template.name ?? ''}`);
    console.log(`  Display name:    ${template.display_name ?? ''}`);
    console.log(`  Traffic:         ${template.percentage_of_traffic ?? 100}%`);
    console.log(`  Split:           ${template.percentages ?? '50/50'}`);
    console.log(`  Unit type:       ${template.unit_type ?? ''}`);
    console.log(`  Application:     ${template.application ?? ''}`);
    console.log(`  Primary metric:  ${template.primary_metric ?? ''}`);
    console.log(`  Secondary:       ${(template.secondary_metrics ?? []).join(', ') || '(none)'}`);
    console.log(`  Guardrail:       ${(template.guardrail_metrics ?? []).join(', ') || '(none)'}`);
    console.log(`  Exploratory:     ${(template.exploratory_metrics ?? []).join(', ') || '(none)'}`);
    console.log(`  Owners:          ${(template.owners ?? []).join(', ') || '(none)'}`);
    console.log(`  Teams:           ${(template.teams ?? []).join(', ') || '(none)'}`);
    console.log(`  Tags:            ${(template.tags ?? []).join(', ') || '(none)'}`);
    console.log(`  Variants:        ${(template.variants ?? []).map(v => v.name).join(', ') || '(none)'}`);
    console.log(`  Analysis:        ${template.analysis_type ?? 'group_sequential'}`);
    console.log('');

    const action = await select<StepAction | 'confirm'>({
      message: 'What next?',
      choices: [
        { name: 'Confirm and proceed', value: 'confirm' },
        { name: 'Back to last step', value: 'back' },
        { name: 'Cancel', value: 'cancel' },
      ],
    });

    if (action === 'confirm') return { action: 'next', template };
    return { action: action as StepAction, template };
  },
};
