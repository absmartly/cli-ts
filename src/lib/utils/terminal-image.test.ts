import { describe, it, expect, afterEach } from 'vitest';
import { supportsInlineImages, displayInlineImage } from './terminal-image.js';

describe('supportsInlineImages', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should return false when TERM_PROGRAM is not set', () => {
    delete process.env.TERM_PROGRAM;
    delete process.env.KONSOLE_VERSION;
    delete process.env.TERM;
    expect(supportsInlineImages()).toBe(false);
  });

  it('should return true for iTerm.app', () => {
    process.env.TERM_PROGRAM = 'iTerm.app';
    expect(supportsInlineImages()).toBe(true);
  });
});

describe('displayInlineImage', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should return false when no protocol detected', () => {
    delete process.env.TERM_PROGRAM;
    delete process.env.KONSOLE_VERSION;
    delete process.env.TERM;
    const result = displayInlineImage(Buffer.from('test'), 'test.png');
    expect(result).toBe(false);
  });
});
