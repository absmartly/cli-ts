import { input } from '@inquirer/prompts';
import {
  getActionDialogField,
  type ActionDialogField,
} from '../../lib/config/action-dialog-cache.js';

export interface NoteOptions {
  note?: string;
  interactive?: boolean;
}

export async function resolveNote(
  options: NoteOptions,
  actionType: string,
  experimentType: string,
  profile?: string
): Promise<string | undefined> {
  const field = getActionDialogField(profile ?? 'default', actionType, experimentType);

  if (options.note) return options.note;

  if (options.interactive) {
    const config: Parameters<typeof input>[0] = {
      message: field?.description || 'Note:',
    };
    if (field?.default_value) config.default = field.default_value;
    if (field?.required) config.validate = (v: string) => v.trim().length > 0 || 'Note is required';
    return await input(config);
  }

  if (field?.default_value) return field.default_value;
  if (field?.required)
    throw new Error(`--note is required for this action (configured in dashboard)`);

  return undefined;
}

export function getFieldConfig(
  actionType: string,
  experimentType: string,
  profile?: string
): ActionDialogField | undefined {
  return getActionDialogField(profile ?? 'default', actionType, experimentType);
}
