import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

function getPackageInfo(): { version: string; buildDate: string } {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf8'));
    return {
      version: packageJson.version || '0.0.0',
      buildDate: packageJson.buildDate || new Date().toISOString(),
    };
  } catch (error) {
    if (process.env.DEBUG) {
      console.error(
        `Warning: Failed to read version from package.json: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
    return { version: '0.0.0-dev', buildDate: new Date().toISOString() };
  }
}

const packageInfo = getPackageInfo();

export const version = packageInfo.version;
export const buildDate = packageInfo.buildDate;
