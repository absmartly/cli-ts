import { readFileSync, existsSync } from 'fs';
import { basename, extname } from 'path';

export interface ScreenshotData {
  data: string;
  file_name: string;
  file_size: number;
  content_type: string;
  width: number;
  height: number;
  crop_left: number;
  crop_top: number;
  crop_width: number;
  crop_height: number;
}

const EXTENSION_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

export function resolveScreenshot(value: string | undefined, variantName: string): ScreenshotData | null {
  if (!value || value.trim() === '') {
    return null;
  }

  if (value.startsWith('data:')) {
    return resolveDataUri(value, variantName);
  }

  return resolveFilePath(value, variantName);
}

function resolveDataUri(uri: string, variantName: string): ScreenshotData {
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(uri);
  if (!match || !match[1] || !match[2]) {
    throw new Error(
      `Invalid data URI for screenshot in variant "${variantName}".\n` +
        `Expected format: data:image/png;base64,<base64data>`,
    );
  }

  const contentType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = MIME_TO_EXTENSION[contentType] || '.png';

  return {
    data: base64Data,
    file_name: `${variantName}${ext}`,
    file_size: buffer.length,
    content_type: contentType,
    width: 0,
    height: 0,
    crop_left: 0,
    crop_top: 0,
    crop_width: 0,
    crop_height: 0,
  };
}

function resolveFilePath(filePath: string, variantName: string): ScreenshotData {
  if (!existsSync(filePath)) {
    throw new Error(
      `Screenshot file not found: ${filePath}\n` +
        `Referenced in variant "${variantName}". Check the path is correct relative to where you run the command.`,
    );
  }

  const buffer = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase();
  const contentType = EXTENSION_TO_MIME[ext] || 'application/octet-stream';

  return {
    data: buffer.toString('base64'),
    file_name: basename(filePath),
    file_size: buffer.length,
    content_type: contentType,
    width: 0,
    height: 0,
    crop_left: 0,
    crop_top: 0,
    crop_width: 0,
    crop_height: 0,
  };
}
