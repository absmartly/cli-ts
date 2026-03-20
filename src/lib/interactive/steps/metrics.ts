import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { promptAsyncSearch, promptNavigation } from '../prompts.js';
import type { Step, StepResult, EditorContext } from '../types.js';
import type { ExperimentTemplate } from '../../../api-client/template/parser.js';

async function searchMetrics(context: EditorContext, term: string) {
  const results = await context.client.listMetrics({ search: term, archived: true });
  return results.map(m => ({ name: m.name, value: m.name }));
}

async function editMetricList(
  label: string,
  current: string[],
  context: EditorContext,
): Promise<string[]> {
  const result = [...current];
  console.log(chalk.gray(`Current ${label}: ${result.length > 0 ? result.join(', ') : '(none)'}`));

  let editing = true;
  while (editing) {
    const action = await select({
      message: `${label}:`,
      choices: [
        { name: 'Keep current', value: 'keep' },
        { name: 'Add metric', value: 'add' },
        ...(result.length > 0 ? [{ name: 'Remove metric', value: 'remove' }] : []),
        { name: 'Clear all', value: 'clear' },
      ],
    });

    if (action === 'keep') {
      editing = false;
    } else if (action === 'clear') {
      result.length = 0;
      editing = false;
    } else if (action === 'add') {
      const metric = await promptAsyncSearch(
        `Search ${label}`,
        (term) => searchMetrics(context, term),
      );
      if (metric && !result.includes(metric)) {
        result.push(metric);
      }
      console.log(chalk.gray(`${label}: ${result.join(', ')}`));
    } else if (action === 'remove') {
      const toRemove = await select({
        message: 'Select metric to remove:',
        choices: result.map(r => ({ name: r, value: r })),
      });
      const idx = result.indexOf(toRemove);
      if (idx >= 0) result.splice(idx, 1);
    }
  }

  return result;
}

export const metricsStep: Step = {
  name: 'Metrics',
  async run(template, context): Promise<StepResult> {
    const primaryMetric = await promptAsyncSearch(
      'Primary metric (type to search)',
      (term) => searchMetrics(context, term),
      template.primary_metric,
    );

    const secondaryMetrics = await editMetricList(
      'Secondary metrics',
      template.secondary_metrics ?? [],
      context,
    );

    const guardrailMetrics = await editMetricList(
      'Guardrail metrics',
      template.guardrail_metrics ?? [],
      context,
    );

    const exploratoryMetrics = await editMetricList(
      'Exploratory metrics',
      template.exploratory_metrics ?? [],
      context,
    );

    const updated: ExperimentTemplate = {
      ...template,
      primary_metric: primaryMetric,
      secondary_metrics: secondaryMetrics,
      guardrail_metrics: guardrailMetrics,
      exploratory_metrics: exploratoryMetrics,
    };
    const action = await promptNavigation('Metrics', false, false);
    return { action, template: updated };
  },
};
