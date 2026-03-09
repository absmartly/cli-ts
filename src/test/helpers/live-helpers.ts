import type { APIClient } from '../../lib/api/client.js';

export interface LiveMetadata {
  appId: number;
  unitTypeId: number;
  teamId: number;
  metricId: number;
}

export async function fetchLiveMetadata(client: APIClient): Promise<LiveMetadata> {
  const [apps, unitTypes, teams, metrics] = await Promise.all([
    client.listApplications(),
    client.listUnitTypes(),
    client.listTeams(),
    client.listMetrics(1),
  ]);

  if (!apps.length) throw new Error('No applications found in live API');
  if (!unitTypes.length) throw new Error('No unit types found in live API');
  if (!teams.length) throw new Error('No teams found in live API');
  if (!metrics.length) throw new Error('No metrics found in live API');

  return {
    appId: apps[0].id,
    unitTypeId: unitTypes[0].id,
    teamId: teams[0].id,
    metricId: metrics[0].id,
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
    owners: [] as never[],
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
  };
}
