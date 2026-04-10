import type { APIClient } from '../../api-client/api-client.js';

export interface ResolveCustomFieldValuesParams {
  customFieldValues: Record<string, string>;
  defaultType: string;
}

export async function resolveCustomFieldValues(
  client: APIClient,
  params: ResolveCustomFieldValuesParams
): Promise<Record<string, { type: string; value: string }>> {
  const allFields = await client.listCustomSectionFields();
  const relevant = allFields.filter(
    (f) =>
      !f.archived && f.custom_section?.type === params.defaultType && !f.custom_section?.archived
  );

  const fieldValues: Record<string, { type: string; value: string }> = {};
  for (const field of relevant) {
    const title = (field as { title?: string }).title ?? field.name ?? '';
    const cliValue = params.customFieldValues[title];
    if (cliValue !== undefined) {
      fieldValues[field.id] = { type: field.type, value: cliValue };
    }
  }

  return fieldValues;
}
