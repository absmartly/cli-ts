import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPackageInfo() {
  try {
    const packagePath = join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return {
      version: packageJson.version || '0.0.0',
      buildDate: packageJson.buildDate || new Date().toISOString(),
    };
  } catch {
    return {
      version: '0.0.0',
      buildDate: new Date().toISOString(),
    };
  }
}

const { version: pkgVersion, buildDate: pkgBuildDate } = getPackageInfo();

export const version = pkgVersion;
export const buildDate = pkgBuildDate;
