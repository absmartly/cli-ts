import type { ExperimentTemplate } from './parser.js';

export function mergeTemplateOverrides(base: ExperimentTemplate, overrides: ExperimentTemplate): ExperimentTemplate {
  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'object' && !Array.isArray(value) && value !== null && Object.keys(value).length === 0) continue;
    merged[key] = value;
  }
  return merged as ExperimentTemplate;
}
