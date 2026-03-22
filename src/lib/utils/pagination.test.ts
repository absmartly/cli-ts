import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { addPaginationOptions, printPaginationFooter } from './pagination.js';

describe('addPaginationOptions', () => {
  it('should add --items and --page options to a Command', () => {
    const cmd = new Command('test');
    addPaginationOptions(cmd);

    const optionNames = cmd.options.map(o => o.long);
    expect(optionNames).toContain('--items');
    expect(optionNames).toContain('--page');
  });

  it('should use custom default items', () => {
    const cmd = new Command('test');
    addPaginationOptions(cmd, 50);

    const itemsOpt = cmd.options.find(o => o.long === '--items');
    expect(itemsOpt?.defaultValue).toBe(50);
  });
});

describe('printPaginationFooter', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should show "Next: --page N+1" when count >= items', () => {
    printPaginationFooter(20, 20, 1);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('Next: --page 2');
  });

  it('should show just count when count < items', () => {
    printPaginationFooter(5, 20, 1);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('5 results');
    expect(output).not.toContain('Next:');
  });
});
