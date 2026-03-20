import type { ExperimentTemplate } from './parser.js';

export function mergeTemplateOverrides(base: ExperimentTemplate, overrides: ExperimentTemplate): ExperimentTemplate {
  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
      merged[key] = value;
    }
  }
  return merged as ExperimentTemplate;
}
