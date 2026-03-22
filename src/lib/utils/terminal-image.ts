import { execFileSync } from 'node:child_process';

type ImageProtocol = 'iterm' | 'kitty' | 'sixel' | null;

function detectProtocol(): ImageProtocol {
  const termProgram = process.env.TERM_PROGRAM ?? '';
  if (['iTerm.app', 'WezTerm', 'mintty'].includes(termProgram)) return 'iterm';
  if (process.env.KONSOLE_VERSION) return 'iterm';
  if (termProgram === 'kitty' || process.env.TERM === 'xterm-kitty') return 'kitty';

  const termEnv = process.env.TERM ?? '';
  if (termEnv.includes('sixel') || ['foot', 'mlterm', 'contour'].includes(termProgram)) return 'sixel';

  return null;
}

function renderIterm(buffer: Buffer, fileName: string, width: number): string {
  const b64 = buffer.toString('base64');
  const nameB64 = Buffer.from(fileName).toString('base64');
  return `\x1b]1337;File=name=${nameB64};size=${buffer.length};inline=1;width=${width};preserveAspectRatio=1:${b64}\x07`;
}

function renderKitty(buffer: Buffer, width: number): string {
  const b64 = buffer.toString('base64');
  const chunkSize = 4096;
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += chunkSize) {
    const chunk = b64.slice(i, i + chunkSize);
    const isLast = i + chunkSize >= b64.length;
    if (i === 0) {
      chunks.push(`\x1b_Ga=T,f=100,t=d,c=${width},m=${isLast ? 0 : 1};${chunk}\x1b\\`);
    } else {
      chunks.push(`\x1b_Gm=${isLast ? 0 : 1};${chunk}\x1b\\`);
    }
  }
  return chunks.join('');
}

function renderSixel(buffer: Buffer): string | null {
  try {
    const result = execFileSync('img2sixel', ['-'], { input: buffer, maxBuffer: 10 * 1024 * 1024 });
    return result.toString();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    console.error(`Warning: sixel rendering failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

export function displayInlineImage(buffer: Buffer, fileName: string, widthCols = 20): boolean {
  const protocol = detectProtocol();
  if (!protocol) return false;

  let output: string | null = null;
  switch (protocol) {
    case 'iterm':
      output = renderIterm(buffer, fileName, widthCols);
      break;
    case 'kitty':
      output = renderKitty(buffer, widthCols);
      break;
    case 'sixel':
      output = renderSixel(buffer);
      break;
  }

  if (!output) return false;
  process.stdout.write(output + '\n');
  return true;
}

export function supportsInlineImages(): boolean {
  return detectProtocol() !== null;
}

export async function fetchAndDisplayImage(url: string, fileName: string, options?: {
  headers?: Record<string, string>;
  width?: number;
}): Promise<boolean> {
  if (!supportsInlineImages()) return false;

  try {
    const fetchInit: RequestInit = {};
    if (options?.headers) fetchInit.headers = options.headers;
    const response = await fetch(url, fetchInit);
    if (!response.ok) {
      console.error(`Warning: Image fetch failed (${response.status}): ${url}`);
      return false;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return displayInlineImage(buffer, fileName, options?.width ?? 20);
  } catch (error) {
    console.error(`Warning: Could not display image: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}
