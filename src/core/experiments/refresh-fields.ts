import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { saveCachedFields } from '../../lib/config/custom-fields-cache.js';
import { saveCachedActionDialogFields, type ActionDialogField } from '../../lib/config/action-dialog-cache.js';

export interface RefreshFieldsParams {
  profile: string;
}

export interface RefreshFieldsData {
  relevantFields: Array<{ title: string; type: string; sectionType: string }>;
  actionFields: ActionDialogField[];
  requiredActionFields: ActionDialogField[];
}

export async function refreshFields(
  client: APIClient,
  params: RefreshFieldsParams,
): Promise<CommandResult<RefreshFieldsData>> {
  const [fields, actionFields] = await Promise.all([
    client.listCustomSectionFields(),
    client.listExperimentActionDialogFields() as Promise<ActionDialogField[]>,
  ]);

  for (const type of ['test', 'feature']) {
    saveCachedFields(params.profile, type, fields);
  }

  saveCachedActionDialogFields(params.profile, actionFields);

  const relevant = fields.filter(f => !f.archived && !f.custom_section?.archived);
  const relevantFields = relevant.map(f => ({
    title: (f as { title?: string }).title ?? f.name ?? '',
    type: f.type,
    sectionType: (f.custom_section as { type?: string })?.type ?? '',
  }));

  const requiredActionFields = actionFields.filter(f => f.required);

  return {
    data: { relevantFields, actionFields, requiredActionFields },
  };
}
