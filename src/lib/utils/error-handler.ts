import chalk from 'chalk';

export const BUG_REPORT_URL = 'https://github.com/absmartly/absmartly-cli/issues';

export function handleFatalError(label: string, reason: unknown): never {
  console.error(chalk.red(`\nFatal error (${label}):`));
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error(error.message);
  if (process.env.DEBUG) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  console.error(`\nThis is a bug. Please report it at: ${BUG_REPORT_URL}`);
  process.exit(1);
}
