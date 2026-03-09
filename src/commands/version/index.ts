import { Command } from 'commander';
import { version, buildDate } from '../../lib/utils/version.js';

export const versionCommand = new Command('version')
  .description('Show version information')
  .action(() => {
    console.log(`ABSmartly CLI v${version}`);
    console.log(`Build date: ${buildDate}`);
    console.log(`Node.js: ${process.version}`);
  });
