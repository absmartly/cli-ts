import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { generateTemplateFromClient } from '../../lib/template/generator.js';

export interface GenerateTemplateParams {
  name: string;
  type: string;
}

export interface GenerateTemplateData {
  content: string;
}

export async function generateTemplate(
  client: APIClient,
  params: GenerateTemplateParams
): Promise<CommandResult<GenerateTemplateData>> {
  const content = await generateTemplateFromClient(client, {
    name: params.name,
    type: params.type,
  });

  return { data: { content } };
}
