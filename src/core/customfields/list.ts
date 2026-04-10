import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { summarizeCustomFieldRow } from '../../api-client/entity-summary.js';

export interface ListCustomFieldsParams {
  items: number;
  page: number;
}

export async function listCustomFields(
  client: APIClient,
  params: ListCustomFieldsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listCustomSectionFields(params.items, params.page);
  return {
    data,
    rows: (data as unknown as Array<Record<string, unknown>>).map(summarizeCustomFieldRow),
  };
}
