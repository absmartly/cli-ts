import { createWriteStream, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import https from 'https';
import http from 'http';

export interface DownloadOptions {
  url: string;
  outputPath: string;
  headers?: Record<string, string>;
  onProgress?: (downloaded: number, total: number | null) => void;
}

export interface DownloadResult {
  outputPath: string;
  bytes: number;
  resumed: boolean;
}

function getExistingSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function httpGet(
  url: string,
  headers: Record<string, string>
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { headers }, resolve);
    req.on('error', reject);
  });
}

async function resolveRedirects(
  url: string,
  headers: Record<string, string>,
  maxRedirects = 10
): Promise<http.IncomingMessage> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    const response = await httpGet(currentUrl, headers);
    const status = response.statusCode ?? 0;

    if (status >= 300 && status < 400 && response.headers.location) {
      response.resume(); // drain the response body
      currentUrl = response.headers.location;
      // Strip auth headers on cross-origin redirects (e.g., to S3)
      const originalHost = new URL(url).host;
      const redirectHost = new URL(currentUrl).host;
      if (originalHost !== redirectHost) {
        delete headers['Authorization'];
        delete headers['authorization'];
      }
      redirectCount++;
      continue;
    }

    return response;
  }

  throw new Error(`Too many redirects (${maxRedirects})`);
}

export async function downloadFile(options: DownloadOptions): Promise<DownloadResult> {
  const { url, outputPath, onProgress } = options;

  const existingSize = getExistingSize(outputPath);
  const headers: Record<string, string> = { ...options.headers };

  if (existingSize > 0) {
    headers['Range'] = `bytes=${existingSize}-`;
  }

  const response = await resolveRedirects(url, headers);
  const status = response.statusCode ?? 0;

  // 416 = Range Not Satisfiable — file is already complete
  if (status === 416) {
    response.resume();
    return { outputPath, bytes: existingSize, resumed: false };
  }

  const resumed = status === 206;
  const contentLength = response.headers['content-length']
    ? parseInt(response.headers['content-length'], 10)
    : null;
  const total = contentLength !== null
    ? (resumed ? existingSize + contentLength : contentLength)
    : null;

  if (status !== 200 && status !== 206) {
    response.resume();
    throw new Error(`Download failed with status ${status}`);
  }

  // If server ignores Range and sends 200, start from scratch
  const writeFlags = resumed ? 'a' : 'w';
  let downloaded = resumed ? existingSize : 0;

  const progress = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      downloaded += chunk.length;
      onProgress?.(downloaded, total);
      callback(null, chunk);
    },
  });

  const fileStream = createWriteStream(outputPath, { flags: writeFlags });

  await pipeline(response, progress, fileStream);

  return { outputPath, bytes: downloaded, resumed };
}
