import { readFileSync } from 'fs';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';

export type { VariantTemplate, ExperimentTemplate } from '../../api-client/template/parser.js';
export { parseExperimentMarkdown } from '../../api-client/template/parser.js';

export function readTemplateFile(filePath: string): string {
  try {
    return readFileSync(filePath === '-' ? '/dev/stdin' : filePath, 'utf8');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        throw new Error(
          `Template file not found: ${filePath}\n` + `Please check the file path and try again.`
        );
      }
      if (error.message.includes('EACCES')) {
        throw new Error(
          `Permission denied reading template file: ${filePath}\n` + `Run: chmod +r ${filePath}`
        );
      }
    }
    throw new Error(
      `Failed to read template file ${filePath}: ${error instanceof Error ? error.message : error}`
    );
  }
}

export function parseExperimentFile(filePath: string) {
  const content = readTemplateFile(filePath);
  return parseExperimentMarkdown(content);
}
