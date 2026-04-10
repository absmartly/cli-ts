import { createWriteStream, readFileSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import https from 'https';
import http from 'http';

export interface DownloadOptions {
  url: string;
  outputPath: string;
  headers?: Record<string, string>;
  resume?: boolean;
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

function metaPath(outputPath: string): string {
  return `${outputPath}.download`;
}

function saveMeta(outputPath: string, finalUrl: string): void {
  writeFileSync(metaPath(outputPath), finalUrl, 'utf-8');
}

function loadMeta(outputPath: string): string | null {
  try {
    return readFileSync(metaPath(outputPath), 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

function cleanupMeta(outputPath: string): void {
  try {
    unlinkSync(metaPath(outputPath));
  } catch {
    // ignore
  }
}

function httpGet(url: string, headers: Record<string, string>): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { headers }, resolve);
    req.on('error', reject);
  });
}

interface ResolvedResponse {
  response: http.IncomingMessage;
  finalUrl: string;
  finalHeaders: Record<string, string>;
}

async function resolveRedirects(
  url: string,
  headers: Record<string, string>,
  maxRedirects = 10
): Promise<ResolvedResponse> {
  let currentUrl = url;
  const reqHeaders = { ...headers };
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    const response = await httpGet(currentUrl, reqHeaders);
    const status = response.statusCode ?? 0;

    if (status >= 300 && status < 400 && response.headers.location) {
      response.resume();
      const redirectLocation = response.headers.location;
      const resolvedUrl = new URL(redirectLocation, currentUrl).href;
      const originalHost = new URL(currentUrl).host;
      const redirectHost = new URL(resolvedUrl).host;
      if (originalHost !== redirectHost) {
        delete reqHeaders['Authorization'];
        delete reqHeaders['authorization'];
      }
      currentUrl = resolvedUrl;
      redirectCount++;
      continue;
    }

    return { response, finalUrl: currentUrl, finalHeaders: reqHeaders };
  }

  throw new Error(`Too many redirects (${maxRedirects})`);
}

export async function downloadFile(options: DownloadOptions): Promise<DownloadResult> {
  const { url, outputPath, onProgress } = options;

  const existingSize = options.resume ? getExistingSize(outputPath) : 0;

  // On resume, try the saved S3 URL directly (avoids hitting the API which triggers cleanup)
  if (existingSize > 0) {
    const savedUrl = loadMeta(outputPath);
    if (savedUrl) {
      const rangeHeaders: Record<string, string> = { Range: `bytes=${existingSize}-` };
      const rangeResponse = await httpGet(savedUrl, rangeHeaders);
      const rangeStatus = rangeResponse.statusCode ?? 0;

      if (rangeStatus === 416) {
        rangeResponse.resume();
        cleanupMeta(outputPath);
        return { outputPath, bytes: existingSize, resumed: false };
      }

      if (rangeStatus === 206) {
        const result = await finishDownload(rangeResponse, outputPath, existingSize, true, onProgress);
        cleanupMeta(outputPath);
        return result;
      }

      // Saved URL no longer works — fall through to full resolve
      rangeResponse.resume();
    }
  }

  // Resolve redirects (API → S3) to get the final URL
  const headers: Record<string, string> = { ...options.headers };
  const { response, finalUrl, finalHeaders } = await resolveRedirects(url, headers);
  const status = response.statusCode ?? 0;

  if (status < 200 || status >= 300) {
    response.resume();
    throw new Error(`Download failed with status ${status}`);
  }

  // Save the final URL for resume
  saveMeta(outputPath, finalUrl);

  // If resuming but no saved URL worked, try Range on the newly resolved URL
  if (existingSize > 0) {
    response.resume();
    const rangeHeaders = { ...finalHeaders, Range: `bytes=${existingSize}-` };
    const rangeResponse = await httpGet(finalUrl, rangeHeaders);
    const rangeStatus = rangeResponse.statusCode ?? 0;

    if (rangeStatus === 416) {
      rangeResponse.resume();
      cleanupMeta(outputPath);
      return { outputPath, bytes: existingSize, resumed: false };
    }

    if (rangeStatus === 206) {
      const result = await finishDownload(rangeResponse, outputPath, existingSize, true, onProgress);
      cleanupMeta(outputPath);
      return result;
    }

    // Server doesn't support Range — restart from scratch
    rangeResponse.resume();
  }

  const result = await finishDownload(response, outputPath, 0, false, onProgress);
  cleanupMeta(outputPath);
  return result;
}

async function finishDownload(
  response: http.IncomingMessage,
  outputPath: string,
  existingSize: number,
  resumed: boolean,
  onProgress?: (downloaded: number, total: number | null) => void
): Promise<DownloadResult> {
  const contentLength = response.headers['content-length']
    ? parseInt(response.headers['content-length'], 10)
    : null;
  const total =
    contentLength !== null ? (resumed ? existingSize + contentLength : contentLength) : null;

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
