import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ReorderCustomSectionsParams {
  sections: Array<{ id: number; order_index: number }>;
}

export async function reorderCustomSections(
  client: APIClient,
  params: ReorderCustomSectionsParams
): Promise<CommandResult<unknown>> {
  await client.reorderCustomSections(params.sections);
  return { data: { reordered: true } };
}
