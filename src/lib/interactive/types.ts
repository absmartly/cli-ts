import type { ExperimentTemplate } from '../../api-client/template/parser.js';
import type { APIClient } from '../../api-client/api-client.js';

export type StepAction = 'next' | 'back' | 'skip' | 'review' | 'cancel';

export interface StepResult {
  action: StepAction;
  template: ExperimentTemplate;
}

export interface EditorContext {
  client: APIClient;
  applications: Array<{ id: number; name: string }>;
  unitTypes: Array<{ id: number; name: string }>;
  teams: Array<{ id: number; name: string }>;
  experimentTags: Array<{ id: number; tag: string }>;
  customSectionFields: Array<{
    id: number;
    name: string;
    type: string;
    default_value?: string;
    archived?: boolean;
    custom_section?: { type?: string; archived?: boolean };
  }>;
  experimentType: string;
}

export interface Step {
  name: string;
  run(template: ExperimentTemplate, context: EditorContext): Promise<StepResult>;
  shouldSkip?(template: ExperimentTemplate, context: EditorContext): boolean;
}
