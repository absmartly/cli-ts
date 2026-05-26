import { describe, it, expect, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { setTTYOverride, readStdinText } from './stdin.js';

describe('readStdinText', () => {
  let originalStdin: typeof process.stdin;

  afterEach(() => {
    if (originalStdin) {
      Object.defineProperty(process, 'stdin', {
        value: originalStdin,
        configurable: true,
      });
    }
    setTTYOverride({ stdin: true, stdout: true });
  });

  function replaceStdin(content: string): void {
    originalStdin = process.stdin;
    const stream = new PassThrough();
    stream.end(content);
    Object.defineProperty(process, 'stdin', {
      value: stream,
      configurable: true,
    });
    setTTYOverride({ stdin: false });
  }

  it('returns the full stdin contents verbatim', async () => {
    replaceStdin('SELECT 1\n');
    const result = await readStdinText();
    expect(result).toBe('SELECT 1\n');
  });

  it('preserves embedded blank lines and trailing whitespace', async () => {
    replaceStdin('SELECT a,\n\n  b\nFROM t\n');
    const result = await readStdinText();
    expect(result).toBe('SELECT a,\n\n  b\nFROM t\n');
  });

  it('returns an empty string when stdin is empty', async () => {
    replaceStdin('');
    const result = await readStdinText();
    expect(result).toBe('');
  });
});
