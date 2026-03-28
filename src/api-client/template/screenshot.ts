import { readFileSync, existsSync } from 'fs';
import { basename, extname } from 'path';
import { imageSize } from 'image-size';

function getImageDimensions(buffer: Buffer): { width: number; height: number } {
  try {
    const result = imageSize(buffer);
    return { width: result.width ?? 0, height: result.height ?? 0 };
  } catch (e) {
    console.error(`Warning: could not determine image dimensions: ${e instanceof Error ? e.message : e}`);
    return { width: 0, height: 0 };
  }
}

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

export async function resolveScreenshot(value: string | undefined, variantName: string): Promise<ScreenshotData | null> {
  if (!value || value.trim() === '') {
    return null;
  }

  if (value.startsWith('data:')) {
    return resolveDataUri(value, variantName);
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return resolveUrl(value, variantName);
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

  const dims = getImageDimensions(buffer);

  return {
    data: base64Data,
    file_name: `${variantName}${ext}`,
    file_size: buffer.length,
    content_type: contentType,
    width: dims.width,
    height: dims.height,
    crop_left: 0,
    crop_top: 0,
    crop_width: dims.width,
    crop_height: dims.height,
  };
}

async function resolveUrl(url: string, variantName: string): Promise<ScreenshotData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(
      `Failed to fetch screenshot from ${url}: ${response.status} ${response.statusText}\n` +
      `Referenced in variant "${variantName}".`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentTypeHeader = response.headers.get('content-type') || '';
  const contentType = contentTypeHeader.split(';')[0]?.trim() || 'image/png';

  const urlPath = new URL(url).pathname;
  const urlExt = extname(urlPath).toLowerCase();
  const fileName = urlExt
    ? basename(urlPath)
    : `${variantName}${MIME_TO_EXTENSION[contentType] || '.png'}`;

  const dims = getImageDimensions(buffer);

  return {
    data: buffer.toString('base64'),
    file_name: fileName,
    file_size: buffer.length,
    content_type: EXTENSION_TO_MIME[urlExt] || contentType,
    width: dims.width,
    height: dims.height,
    crop_left: 0,
    crop_top: 0,
    crop_width: dims.width,
    crop_height: dims.height,
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

  const dims = getImageDimensions(buffer);

  return {
    data: buffer.toString('base64'),
    file_name: basename(filePath),
    file_size: buffer.length,
    content_type: contentType,
    width: dims.width,
    height: dims.height,
    crop_left: 0,
    crop_top: 0,
    crop_width: dims.width,
    crop_height: dims.height,
  };
}
