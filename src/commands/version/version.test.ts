import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { versionCommand } from './index.js';

describe('version command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should print version info', async () => {
    await versionCommand.parseAsync(['node', 'test']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('ABSmartly CLI v');
    expect(output).toContain('Build date:');
    expect(output).toContain('Node.js:');
  });
});
