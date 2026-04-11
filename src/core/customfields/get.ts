import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CustomSectionFieldId } from '../../lib/api/branded-types.js';
import { applyShowExclude, summarizeCustomField } from '../../api-client/entity-summary.js';

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
  const field = await client.getCustomSectionField(params.id);
  const show = params.show ?? [];
  const exclude = params.exclude ?? [];

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
