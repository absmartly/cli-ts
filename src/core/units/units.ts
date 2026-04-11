import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { UnitTypeId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface ListUnitsParams {
  items: number;
  page: number;
}

export async function listUnits(
  client: APIClient,
  params: ListUnitsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listUnitTypes(params.items, params.page);
  return { data };
}

export interface GetUnitParams {
  id: UnitTypeId;
}

export async function getUnit(
  client: APIClient,
  params: GetUnitParams
): Promise<CommandResult<unknown>> {
  const data = await client.getUnitType(params.id);
  return { data };
}

export interface CreateUnitParams {
  name: string;
  description?: string | undefined;
}

export async function createUnit(
  client: APIClient,
  params: CreateUnitParams
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = { name: params.name };
  if (params.description) payload.description = params.description;
  const data = await client.createUnitType(payload as { name: string });
  return { data };
}

export interface UpdateUnitParams {
  id: UnitTypeId;
  name?: string | undefined;
  description?: string | undefined;
}

export async function updateUnit(
  client: APIClient,
  params: UpdateUnitParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, unknown> = {};
  if (params.name) data.name = params.name;
  if (params.description) data.description = params.description;

  requireAtLeastOneField(data, 'update field');
  await client.updateUnitType(params.id, data);
  return { data: { id: params.id } };
}

export interface ArchiveUnitParams {
  id: UnitTypeId;
  unarchive?: boolean | undefined;
}

export async function archiveUnit(
  client: APIClient,
  params: ArchiveUnitParams
): Promise<CommandResult<unknown>> {
  await client.archiveUnitType(params.id, params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
