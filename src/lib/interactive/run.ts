import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentTemplate } from '../../api-client/template/parser.js';
import { InteractiveEditor } from './editor.js';
import type { EditorContext } from './types.js';

export async function runInteractiveEditor(
  client: APIClient,
  initial: ExperimentTemplate,
  experimentType: string
): Promise<ExperimentTemplate | null> {
  const [applications, unitTypes, teams, experimentTags, customSectionFields] = await Promise.all([
    client.listApplications(),
    client.listUnitTypes(),
    client.listTeams(),
    client.listExperimentTags(),
    client.listCustomSectionFields(),
  ]);

  const context: EditorContext = {
    client,
    applications,
    unitTypes,
    teams,
    experimentTags,
    customSectionFields,
    experimentType,
  };

  const editor = new InteractiveEditor(context);
  return editor.run(initial);
}
