import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CustomSectionFieldId } from '../../lib/api/branded-types.js';
import type { CustomSectionField } from '../../api-client/types.js';
import {
  applyShowExclude,
  summarizeCustomField,
  summarizeCustomFieldRow,
} from '../../api-client/entity-summary.js';

// --- List custom fields ---
export interface ListCustomFieldsParams {
  type: string;
  items?: number | undefined;
  page?: number | undefined;
  raw?: boolean | undefined;
}

export async function listCustomFields(
  client: APIClient,
  params: ListCustomFieldsParams
): Promise<CommandResult<Record<string, unknown>[]>> {
  const items = params.items ?? 100;
  const page = params.page ?? 1;
  const allFields = await client.listCustomSectionFields({ items, page });
  const fields = (allFields as unknown as Array<Record<string, unknown>>).filter((f) => {
    const section = f.custom_section as Record<string, unknown> | undefined;
    return section?.type === params.type;
  });

  const rows = params.raw ? fields : fields.map((f) => summarizeCustomFieldRow(f));

  return {
    data: fields,
    rows,
    pagination: {
      page,
      items,
      hasMore: fields.length >= items,
    },
  };
}

// --- Get custom field ---
export interface GetCustomFieldParams {
  id: CustomSectionFieldId;
  show?: string[] | undefined;
  exclude?: string[] | undefined;
  raw?: boolean | undefined;
}

export async function getCustomField(
  client: APIClient,
  params: GetCustomFieldParams
): Promise<CommandResult<unknown>> {
  const show = params.show ?? [];
  const exclude = params.exclude ?? [];
  const field = await client.getCustomSectionField(params.id);
  const data = params.raw
    ? field
    : applyShowExclude(
        summarizeCustomField(field as unknown as Record<string, unknown>),
        field as unknown as Record<string, unknown>,
        show,
        exclude
      );
  return { data };
}

// --- Create custom field ---
export interface CreateCustomFieldParams {
  name: string;
  type: string;
  defaultValue?: string;
}

export async function createCustomField(
  client: APIClient,
  params: CreateCustomFieldParams
): Promise<CommandResult<unknown>> {
  const data: Partial<CustomSectionField> = {
    name: params.name,
    type: params.type,
  };
  if (params.defaultValue !== undefined) data.default_value = params.defaultValue;
  const field = await client.createCustomSectionField(data);
  return { data: field };
}

// --- Update custom field ---
export interface UpdateCustomFieldParams {
  id: CustomSectionFieldId;
  name?: string;
  type?: string;
  defaultValue?: string;
}

export async function updateCustomField(
  client: APIClient,
  params: UpdateCustomFieldParams
): Promise<CommandResult<unknown>> {
  const data: Partial<CustomSectionField> = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.type !== undefined) data.type = params.type;
  if (params.defaultValue !== undefined) data.default_value = params.defaultValue;
  if (Object.keys(data).length === 0) {
    throw new Error('At least one update field is required');
  }
  const field = await client.updateCustomSectionField(params.id, data);
  return { data: field };
}

// --- Archive custom field ---
export interface ArchiveCustomFieldParams {
  id: CustomSectionFieldId;
  unarchive?: boolean;
}

export async function archiveCustomField(
  client: APIClient,
  params: ArchiveCustomFieldParams
): Promise<CommandResult<{ id: CustomSectionFieldId; action: string }>> {
  await client.archiveCustomSectionField(params.id, !!params.unarchive);
  const action = params.unarchive ? 'unarchived' : 'archived';
  return { data: { id: params.id, action } };
}
