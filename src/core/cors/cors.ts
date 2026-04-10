import type { APIClient } from '../../api-client/api-client.js';
import type { CorsOriginId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export async function listCorsOrigins(client: APIClient): Promise<CommandResult<unknown>> {
  const data = await client.listCorsOrigins();
  return { data };
}

export interface GetCorsOriginParams {
  id: CorsOriginId;
}

export async function getCorsOrigin(
  client: APIClient,
  params: GetCorsOriginParams
): Promise<CommandResult<unknown>> {
  const data = await client.getCorsOrigin(params.id);
  return { data };
}

export interface CreateCorsOriginParams {
  origin: string;
}

export async function createCorsOrigin(
  client: APIClient,
  params: CreateCorsOriginParams
): Promise<CommandResult<unknown>> {
  const data = await client.createCorsOrigin({ origin: params.origin });
  return { data };
}

export interface UpdateCorsOriginParams {
  id: CorsOriginId;
  origin: string;
}

export async function updateCorsOrigin(
  client: APIClient,
  params: UpdateCorsOriginParams
): Promise<CommandResult<unknown>> {
  const data = await client.updateCorsOrigin(params.id, { origin: params.origin });
  return { data };
}

export interface DeleteCorsOriginParams {
  id: CorsOriginId;
}

export async function deleteCorsOrigin(
  client: APIClient,
  params: DeleteCorsOriginParams
): Promise<CommandResult<unknown>> {
  await client.deleteCorsOrigin(params.id);
  return { data: { id: params.id } };
}
