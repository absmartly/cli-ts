import type { APIClient } from '../../api-client/api-client.js';
import type { CustomSectionId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export async function listCustomSections(
  client: APIClient,
): Promise<CommandResult<unknown>> {
  const data = await client.listCustomSections();
  return { data };
}

export interface CreateCustomSectionParams {
  name: string;
  type: string;
}

export async function createCustomSection(
  client: APIClient,
  params: CreateCustomSectionParams,
): Promise<CommandResult<unknown>> {
  const data = await client.createCustomSection({ name: params.name, type: params.type });
  return { data };
}

export interface UpdateCustomSectionParams {
  id: CustomSectionId;
  name?: string | undefined;
}

export async function updateCustomSection(
  client: APIClient,
  params: UpdateCustomSectionParams,
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = {};
  if (params.name !== undefined) payload.name = params.name;

  requireAtLeastOneField(payload, 'update field');
  const data = await client.updateCustomSection(params.id, payload);
  return { data };
}

export interface ArchiveCustomSectionParams {
  id: CustomSectionId;
  unarchive?: boolean | undefined;
}

export async function archiveCustomSection(
  client: APIClient,
  params: ArchiveCustomSectionParams,
): Promise<CommandResult<unknown>> {
  await client.archiveCustomSection(params.id, !!params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}

export interface ReorderCustomSectionsParams {
  sections: Array<{ id: number; order_index: number }>;
}

export async function reorderCustomSections(
  client: APIClient,
  params: ReorderCustomSectionsParams,
): Promise<CommandResult<unknown>> {
  await client.reorderCustomSections(params.sections);
  return { data: { reordered: true } };
}
