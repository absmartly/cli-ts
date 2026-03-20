import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { promptText, promptNavigation } from '../prompts.js';
import type { Step, StepResult } from '../types.js';
import type { ExperimentTemplate, VariantTemplate } from '../../../api-client/template/parser.js';

export const variantsStep: Step = {
  name: 'Variants',
  async run(template): Promise<StepResult> {
    let variants = [...(template.variants ?? [])];

    if (variants.length === 0) {
      variants = [
        { variant: 0, name: 'control' },
        { variant: 1, name: 'treatment' },
      ];
    }

    let editing = true;
    while (editing) {
      console.log(chalk.gray(`\nCurrent variants: ${variants.map(v => v.name).join(', ')}`));

      const action = await select({
        message: 'Variants:',
        choices: [
          { name: 'Edit a variant', value: 'edit' },
          { name: 'Add variant', value: 'add' },
          { name: 'Remove variant', value: 'remove' },
          { name: 'Done with variants', value: 'done' },
        ],
      });

      if (action === 'done') {
        editing = false;
      } else if (action === 'edit') {
        if (variants.length === 0) {
          console.log(chalk.yellow('No variants to edit.'));
          continue;
        }
        const idx = await select({
          message: 'Select variant to edit:',
          choices: variants.map((v, i) => ({ name: `${v.name} (variant_${v.variant ?? i})`, value: i })),
        });
        const v = variants[idx]!;
        v.name = await promptText('Variant name', v.name);
        v.config = await promptText('Variant config (JSON string)', v.config ?? '');
        if (!v.config) delete v.config;
      } else if (action === 'add') {
        const name = await input({ message: 'New variant name:' });
        const config = await promptText('Config (JSON string, or empty)', '');
        const newVariant: VariantTemplate = {
          variant: variants.length,
          name: name.trim() || `variant_${variants.length}`,
        };
        if (config) newVariant.config = config;
        variants.push(newVariant);
      } else if (action === 'remove') {
        if (variants.length <= 2) {
          console.log(chalk.yellow('Must have at least 2 variants.'));
          continue;
        }
        const idx = await select({
          message: 'Select variant to remove:',
          choices: variants.map((v, i) => ({ name: v.name, value: i })),
        });
        variants.splice(idx, 1);
        for (let i = 0; i < variants.length; i++) {
          variants[i]!.variant = i;
        }
      }
    }

    const updated: ExperimentTemplate = { ...template, variants };
    const nav = await promptNavigation('Variants', false, false);
    return { action: nav, template: updated };
  },
};
