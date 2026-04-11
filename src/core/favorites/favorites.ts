import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId, MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export type FavoriteType = 'experiment' | 'metric';

export interface AddFavoriteParams {
  type: string;
  id: number;
}

export async function addFavorite(
  client: APIClient,
  params: AddFavoriteParams
): Promise<CommandResult<void>> {
  if (params.type === 'experiment') {
    await client.favoriteExperiment(params.id as ExperimentId, true);
  } else if (params.type === 'metric') {
    await client.favoriteMetric(params.id as MetricId, true);
  } else {
    throw new Error(`Invalid type "${params.type}". Must be "experiment" or "metric".`);
  }
  return { data: undefined };
}

export interface RemoveFavoriteParams {
  type: string;
  id: number;
}

export async function removeFavorite(
  client: APIClient,
  params: RemoveFavoriteParams
): Promise<CommandResult<void>> {
  if (params.type === 'experiment') {
    await client.favoriteExperiment(params.id as ExperimentId, false);
  } else if (params.type === 'metric') {
    await client.favoriteMetric(params.id as MetricId, false);
  } else {
    throw new Error(`Invalid type "${params.type}". Must be "experiment" or "metric".`);
  }
  return { data: undefined };
}
