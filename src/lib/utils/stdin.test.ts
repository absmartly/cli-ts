import { describe, it, expect, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { isStdinPiped, isStdoutPiped, setTTYOverride, readStdinText } from './stdin.js';

describe('stdin utilities', () => {
  afterEach(() => {
    setTTYOverride({ stdin: true, stdout: true });
  });

  it('should report stdin as TTY when override is set', () => {
    setTTYOverride({ stdin: true });
    expect(isStdinPiped()).toBe(false);
  });

  it('should report stdin as piped when override is set', () => {
    setTTYOverride({ stdin: false });
    expect(isStdinPiped()).toBe(true);
  });

  it('should report stdout as TTY when override is set', () => {
    setTTYOverride({ stdout: true });
    expect(isStdoutPiped()).toBe(false);
  });

  it('should report stdout as piped when override is set', () => {
    setTTYOverride({ stdout: false });
    expect(isStdoutPiped()).toBe(true);
  });
});

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
