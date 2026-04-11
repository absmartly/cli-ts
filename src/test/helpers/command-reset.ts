import { Command } from 'commander';

export function resetCommand(cmd: Command): void {
  for (const option of cmd.options) {
    cmd.setOptionValueWithSource(option.attributeName(), option.defaultValue, 'default');
  }
  for (const sub of cmd.commands) {
    resetCommand(sub);
  }
}
