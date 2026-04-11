import { describe, it, expect, afterEach } from 'vitest';
import { isStdinPiped, isStdoutPiped, setTTYOverride } from './stdin.js';

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
