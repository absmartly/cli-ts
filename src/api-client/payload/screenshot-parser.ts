import { resolveScreenshot } from '../template/screenshot.js';

export async function parseScreenshotEntries(
  entries: string[],
  variants?: Array<{ name: string }>,
): Promise<Array<{ variant: number; file_upload: unknown }>> {
  const results: Array<{ variant: number; file_upload: unknown }> = [];
  for (const entry of entries) {
    const colonIdx = entry.indexOf(':');
    if (colonIdx === -1) {
      throw new Error(
        `Invalid --screenshot format: "${entry}"\n` +
        `Expected: <variant_index>:<file_path_or_url>\n` +
        `Example: --screenshot 0:./control.png --screenshot 1:https://example.com/treatment.png`
      );
    }
    const variantIdx = parseInt(entry.substring(0, colonIdx), 10);
    const source = entry.substring(colonIdx + 1);
    if (isNaN(variantIdx)) {
      throw new Error(`Invalid variant index in --screenshot: "${entry}"`);
    }
    const variantName = variants?.[variantIdx]?.name || `variant_${variantIdx}`;
    const resolved = await resolveScreenshot(source, variantName);
    if (resolved) {
      results.push({ variant: variantIdx, file_upload: resolved });
    }
  }
  return results;
}
