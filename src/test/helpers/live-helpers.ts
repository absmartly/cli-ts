import type { APIClient } from '../../lib/api/client.js';

export interface LiveMetadata {
  appId: number;
  unitTypeId: number;
  teamId: number;
  metricId: number;
  userId: number;
  customFieldValues: Record<string, { type: string; value: string }>;
}

function defaultValueForType(
  type: string,
  context: { userId: number; defaultValue?: string }
): string {
  if (context.defaultValue) return context.defaultValue;

  switch (type) {
    case 'user':
      return String(context.userId);
    case 'text':
    case 'string':
      return 'vitest placeholder';
    case 'richtext':
      return '<p>vitest placeholder</p>';
    case 'number':
    case 'integer':
      return '0';
    case 'boolean':
      return 'false';
    case 'date':
      return new Date().toISOString().split('T')[0];
    case 'url':
      return 'https://example.com';
    case 'email':
      return 'test@example.com';
    default:
      return '';
  }
}

export async function fetchLiveMetadata(client: APIClient): Promise<LiveMetadata> {
  const [apps, unitTypes, teams, metrics, users, customFields] = await Promise.all([
    client.listApplications(),
    client.listUnitTypes(),
    client.listTeams(),
    client.listMetrics({ archived: true }),
    client.listUsers(),
    client.listCustomSectionFields(),
  ]);

  if (!apps.length) throw new Error('No applications found (check API connection or mock data)');
  if (!unitTypes.length) throw new Error('No unit types found (check API connection or mock data)');
  if (!teams.length) throw new Error('No teams found (check API connection or mock data)');
  if (!metrics.length) throw new Error('No metrics found (check API connection or mock data)');
  if (!users.length) throw new Error('No users found (check API connection or mock data)');

  const userId = users[0].id;

  const customFieldValues: Record<string, { type: string; value: string }> = {};
  for (const f of customFields) {
    if (f.archived || f.custom_section?.archived) continue;
    customFieldValues[String(f.id)] = {
      type: f.type,
      value: defaultValueForType(f.type, { userId, defaultValue: f.default_value }),
    };
  }

  return {
    appId: apps[0].id,
    unitTypeId: unitTypes[0].id,
    teamId: teams[0].id,
    metricId: metrics[0].id,
    userId,
    customFieldValues,
  };
}

export function buildExperimentData(meta: LiveMetadata, nameSuffix = '') {
  return {
    name: `vitest_live_${Date.now()}${nameSuffix}`,
    display_name: 'Vitest Live Test',
    type: 'test',
    teams: [{ team_id: meta.teamId }],
    unit_type: { unit_type_id: meta.unitTypeId },
    applications: [{ application_id: meta.appId, application_version: '1' }],
    primary_metric: { metric_id: meta.metricId },
    secondary_metrics: [] as never[],
    owners: [{ user_id: meta.userId }],
    experiment_tags: [] as never[],
    variants: [
      { name: 'control', variant: 0, config: '{}' },
      { name: 'treatment', variant: 1, config: '{}' },
    ],
    variant_screenshots: [] as never[],
    percentages: '50/50',
    nr_variants: 2,
    percentage_of_traffic: 100,
    analysis_type: 'fixed_horizon',
    required_alpha: 0.05,
    required_power: 0.8,
    audience: '{}',
    minimum_detectable_effect: '5',
    state: 'ready',
    ...(Object.keys(meta.customFieldValues).length > 0
      ? { custom_section_field_values: meta.customFieldValues }
      : {}),
  };
}
