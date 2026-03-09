import type { APIClient } from '../api/client.js';

export interface GeneratorOptions {
  name?: string;
  type?: string;
}

export async function generateTemplate(
  client: APIClient,
  opts: GeneratorOptions = {}
): Promise<string> {
  const apps = await client.listApplications();
  const units = await client.listUnitTypes();
  const metrics = await client.listMetrics(100, 0);

  const name = opts.name || 'my_experiment';
  const experimentType = opts.type || 'test';

  const parts: string[] = [];

  parts.push('# Experiment Template\n');
  parts.push('Edit the values below and run:\n');
  parts.push('```bash\n');
  parts.push('abs experiments create --from-file experiment.md\n');
  parts.push('```\n\n');
  parts.push('---\n\n');
  parts.push('## Basic Info\n\n');
  parts.push(`name: ${name}\n`);
  parts.push(`display_name: ${name.replace(/_/g, ' ')}\n`);
  parts.push(`type: ${experimentType}\n`);
  parts.push('state: created\n\n');
  parts.push('## Runtime\n\n');
  parts.push('end_date: 2025-12-31T18:00:00\n');
  parts.push('duration_days: 28\n');
  parts.push('timezone: Europe/Lisbon\n\n');
  parts.push('## Traffic\n\n');
  parts.push('percentages: 50/50\n');
  parts.push('percentage_of_traffic: 100\n\n');
  parts.push('## Unit & Application\n\n');

  const firstUnit = units[0];
  if (firstUnit) {
    parts.push(`unit_type: ${firstUnit.name}\n`);
    parts.push(`<!-- Available: ${units.map((u) => u.name).join(', ')} -->\n`);
  } else {
    parts.push('unit_type: user_id\n');
  }

  const firstApp = apps[0];
  if (firstApp) {
    parts.push(`application: ${firstApp.name}\n`);
    parts.push(`<!-- Available: ${apps.map((a) => a.name).join(', ')} -->\n`);
  } else {
    parts.push('application: www\n');
  }

  parts.push('\n## Metrics\n\n');

  const firstMetric = metrics[0];
  if (firstMetric) {
    parts.push(`primary_metric: ${firstMetric.name}\n`);
    const metricNames = metrics.slice(0, 5).map((m) => m.name);
    const suffix = metrics.length > 5 ? ', ...' : '';
    parts.push(`<!-- Available: ${metricNames.join(', ')}${suffix} -->\n\n`);
  }

  parts.push('secondary_metrics:\n  - metric_name_1\n  - metric_name_2\n\n');
  parts.push('guardrail_metrics:\n  - guardrail_metric_1\n\n');
  parts.push('## Variants\n\n');
  parts.push('### variant_0\n\n');
  parts.push('name: control\n');
  parts.push('config: {"description": "Original version"}\n\n');
  parts.push('---\n\n');
  parts.push('### variant_1\n\n');
  parts.push('name: treatment\n');
  parts.push('config: {"description": "New version"}\n\n');
  parts.push('---\n\n');
  parts.push('## Description\n\n');
  parts.push('**Hypothesis:**\n');
  parts.push('We believe that changing X will result in improved Y.\n\n');
  parts.push('**Expected Impact:**\n');
  parts.push('- Increase conversion by 10%\n');
  parts.push('- Improve engagement by 15%\n\n');
  parts.push('**Success Criteria:**\n');
  parts.push('- Primary metric shows statistically significant improvement\n');
  parts.push('- No negative impact on guardrail metrics\n');

  return parts.join('');
}
