import { describe, it, expect } from 'vitest';
import { watchCommand } from './watch.js';

describe('watch command', () => {
  it('should exist and have --interval option', () => {
    expect(watchCommand).toBeDefined();
    expect(watchCommand.name()).toBe('watch');

    const intervalOption = watchCommand.options.find((o) => o.long === '--interval');
    expect(intervalOption).toBeDefined();
    expect(intervalOption!.defaultValue).toBe('60');
  });
});
