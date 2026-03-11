import { generateTemplate } from '../../api-client/template/generator.js';
import type { GeneratorOptions } from '../../api-client/template/generator.js';
import type { APIClient } from '../api/client.js';

export type { GeneratorContext, GeneratorOptions } from '../../api-client/template/generator.js';
export { generateTemplate } from '../../api-client/template/generator.js';

export async function generateTemplateFromClient(
  client: APIClient,
  opts: GeneratorOptions = {}
): Promise<string> {
  const apps = await client.listApplications();
  const units = await client.listUnitTypes();
  const metrics = await client.listMetrics(100, 0);

  return generateTemplate(
    { applications: apps, unitTypes: units, metrics },
    opts
  );
}
