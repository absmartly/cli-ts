import { input, select, checkbox, editor, search } from '@inquirer/prompts';
import chalk from 'chalk';
import type { StepAction } from './types.js';

export async function promptText(label: string, defaultValue = ''): Promise<string> {
  return input({ message: label, default: defaultValue || undefined });
}

export async function promptNumber(label: string, defaultValue?: number): Promise<number> {
  const result = await input({
    message: label,
    default: defaultValue !== undefined ? String(defaultValue) : undefined,
    validate: (v) => !isNaN(Number(v)) || 'Must be a number',
  });
  return Number(result);
}

export async function promptSelect<T>(
  label: string,
  choices: Array<{ name: string; value: T }>,
  defaultValue?: T,
): Promise<T> {
  return select({ message: label, choices, default: defaultValue });
}

export async function promptSearchSelect(
  label: string,
  items: Array<{ id: number; name: string }>,
  currentValue?: string,
): Promise<string> {
  if (items.length === 0) return currentValue ?? '';
  const result = await search({
    message: `${label}${currentValue ? chalk.gray(` (current: ${currentValue})`) : ''}`,
    source: (term) => {
      const filtered = term
        ? items.filter(i => i.name.toLowerCase().includes(term.toLowerCase()))
        : items;
      return filtered.map(i => ({ name: i.name, value: i.name }));
    },
  });
  return result;
}

export async function promptAsyncSearch(
  label: string,
  searchFn: (term: string) => Promise<Array<{ name: string; value: string }>>,
  currentValue?: string,
): Promise<string> {
  return search({
    message: `${label}${currentValue ? chalk.gray(` (current: ${currentValue})`) : ''}`,
    source: async (term) => {
      if (!term || term.length < 2) return [];
      return searchFn(term);
    },
  });
}

export async function promptMultiSearch(
  label: string,
  items: Array<{ id: number; name: string }>,
  current: string[] = [],
): Promise<string[]> {
  const choices = items.map(i => ({
    name: i.name,
    value: i.name,
    checked: current.includes(i.name),
  }));
  if (choices.length === 0) return current;
  return checkbox({ message: label, choices });
}

export async function promptJsonEditor(label: string, currentValue?: string): Promise<string> {
  let formatted = '';
  if (currentValue) {
    try {
      formatted = JSON.stringify(JSON.parse(currentValue), null, 2);
    } catch {
      formatted = currentValue;
    }
  }
  return editor({ message: label, default: formatted });
}

export async function promptNavigation(stepName: string, isFirst: boolean, isLast: boolean): Promise<StepAction> {
  const choices: Array<{ name: string; value: StepAction }> = [];
  if (!isLast) choices.push({ name: 'Next', value: 'next' });
  if (!isFirst) choices.push({ name: 'Back', value: 'back' });
  choices.push({ name: 'Skip (keep current)', value: 'skip' });
  choices.push({ name: 'Review all', value: 'review' });
  choices.push({ name: 'Cancel', value: 'cancel' });
  return select({ message: chalk.gray(`[${stepName}]`), choices });
}

export async function promptMultiAdd(
  label: string,
  current: string[] = [],
): Promise<string[]> {
  const result = [...current];
  console.log(chalk.gray(`Current ${label}: ${result.length > 0 ? result.join(', ') : '(none)'}`));
  const action = await select({
    message: `${label}:`,
    choices: [
      { name: 'Keep current', value: 'keep' },
      { name: 'Add item', value: 'add' },
      { name: 'Remove item', value: 'remove' },
      { name: 'Clear all', value: 'clear' },
    ],
  });
  if (action === 'keep') return result;
  if (action === 'clear') return [];
  if (action === 'add') {
    const item = await input({ message: `New ${label} item:` });
    if (item.trim()) result.push(item.trim());
    return result;
  }
  if (action === 'remove' && result.length > 0) {
    const toRemove = await checkbox({
      message: 'Select items to remove:',
      choices: result.map(r => ({ name: r, value: r })),
    });
    return result.filter(r => !toRemove.includes(r));
  }
  return result;
}
