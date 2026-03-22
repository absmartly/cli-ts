import type { Command } from 'commander';
import { loadCachedFields, loadAllCachedFields } from '../../lib/config/custom-fields-cache.js';
import { loadConfig } from '../../lib/config/config.js';

function titleToFlag(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function registerCustomFieldOptions(command: Command, type: string): void {
  const fields = loadAllCachedFields(type);

  const relevantFields = fields.filter(
    f => !f.archived && f.custom_section?.type === type && !f.custom_section?.archived
  );

  for (const field of relevantFields) {
    const title = (field as { title?: string }).title ?? field.name ?? '';
    if (!title) continue;
    const flag = titleToFlag(title);
    if (!flag) continue;
    command.option(`--${flag} <value>`, `${title} (custom field)`);
  }

  command.option('--field <name=value...>', 'set custom field value (name=value, repeatable)');
}

export function extractCustomFieldValues(
  options: Record<string, unknown>,
  type: string,
  profile?: string,
): Record<string, string> {
  const config = loadConfig();
  const defaultProfile = config['default-profile'] || 'default';
  const effectiveProfile = profile || defaultProfile;
  let fields = loadCachedFields(effectiveProfile, type);
  if (fields.length === 0 && effectiveProfile !== defaultProfile) {
    fields = loadCachedFields(defaultProfile, type);
  }
  const result: Record<string, string> = {};

  const relevantFields = fields.filter(
    f => !f.archived && f.custom_section?.type === type && !f.custom_section?.archived
  );

  for (const field of relevantFields) {
    const title = (field as { title?: string }).title ?? field.name ?? '';
    if (!title) continue;
    const flag = titleToFlag(title);
    if (!flag) continue;
    const camelCase = flag.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const value = options[camelCase];
    if (typeof value === 'string') {
      result[title] = value;
    }
  }

  if (Array.isArray(options.field)) {
    for (const entry of options.field as string[]) {
      const eqIdx = entry.indexOf('=');
      if (eqIdx === -1) continue;
      const name = entry.substring(0, eqIdx).trim();
      const value = entry.substring(eqIdx + 1);
      if (name) result[name] = value;
    }
  }

  return result;
}
