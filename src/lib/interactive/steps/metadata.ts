import chalk from 'chalk';
import { promptAsyncSearch, promptMultiSearch, promptText, promptNavigation } from '../prompts.js';
import type { Step, StepResult, EditorContext } from '../types.js';
import type { ExperimentTemplate } from '../../../api-client/template/parser.js';

async function editOwners(current: string[], context: EditorContext): Promise<string[]> {
  const result = [...current];
  console.log(chalk.gray(`Current owners: ${result.length > 0 ? result.join(', ') : '(none)'}`));

  const { select } = await import('@inquirer/prompts');

  let editing = true;
  while (editing) {
    const action = await select({
      message: 'Owners:',
      choices: [
        { name: 'Keep current', value: 'keep' },
        { name: 'Add owner', value: 'add' },
        ...(result.length > 0 ? [{ name: 'Remove owner', value: 'remove' }] : []),
        { name: 'Clear all', value: 'clear' },
      ],
    });

    if (action === 'keep') {
      editing = false;
    } else if (action === 'clear') {
      result.length = 0;
      editing = false;
    } else if (action === 'add') {
      const owner = await promptAsyncSearch(
        'Search user (type email or name)',
        async (term) => {
          const users = await context.client.listUsers({ search: term });
          return users.map(u => ({ name: `${u.email}`, value: u.email }));
        },
      );
      if (owner && !result.includes(owner)) {
        result.push(owner);
      }
      console.log(chalk.gray(`Owners: ${result.join(', ')}`));
    } else if (action === 'remove') {
      const toRemove = await select({
        message: 'Select owner to remove:',
        choices: result.map(r => ({ name: r, value: r })),
      });
      const idx = result.indexOf(toRemove);
      if (idx >= 0) result.splice(idx, 1);
    }
  }

  return result;
}

function groupCustomFields(context: EditorContext) {
  const groups = new Map<string, Array<{ id: number; name: string; type: string; default_value?: string }>>();

  for (const field of context.customSectionFields) {
    if (field.archived) continue;
    const section = field.custom_section?.type ?? 'Other';
    if (field.custom_section?.archived) continue;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(field);
  }

  return groups;
}

export const metadataStep: Step = {
  name: 'Metadata',
  async run(template, context): Promise<StepResult> {
    const owners = await editOwners(template.owners ?? [], context);

    const tagItems = context.experimentTags.map(t => ({ id: t.id, name: t.tag }));
    const teams = await promptMultiSearch('Teams', context.teams, template.teams ?? []);
    const tags = await promptMultiSearch('Tags', tagItems, template.tags ?? []);

    const customFields: Record<string, string> = { ...(template.custom_fields ?? {}) };
    const grouped = groupCustomFields(context);

    for (const [section, fields] of grouped) {
      console.log(chalk.cyan(`\n  ${section}:`));
      for (const field of fields) {
        const current = customFields[field.name] ?? field.default_value ?? '';
        const value = await promptText(`  ${field.name}`, current);
        if (value.trim()) {
          customFields[field.name] = value.trim();
        } else {
          delete customFields[field.name];
        }
      }
    }

    const updated: ExperimentTemplate = {
      ...template,
      owners,
      teams,
      tags,
    };
    if (Object.keys(customFields).length > 0) {
      updated.custom_fields = customFields;
    }
    const action = await promptNavigation('Metadata', false, false);
    return { action, template: updated };
  },
};
