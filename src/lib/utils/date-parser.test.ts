import { describe, it, expect } from 'vitest';
import { parseDateFlag, parseDateFlagOrUndefined } from './date-parser.js';

describe('parseDateFlag', () => {
  it('should parse milliseconds since epoch', () => {
    const result = parseDateFlag('1704067200000');
    expect(result).toBe(1704067200000);
  });

  it('should parse ISO 8601 UTC timestamp', () => {
    const result = parseDateFlag('2024-01-01T00:00:00Z');
    expect(result).toBe(1704067200000);
  });

  it('should parse simple date (UTC midnight)', () => {
    const result = parseDateFlag('2024-01-01');
    expect(result).toBe(1704067200000);
  });

  it('should parse ISO 8601 with timezone', () => {
    const result = parseDateFlag('2024-01-01T00:00:00+00:00');
    expect(result).toBe(1704067200000);
  });

  it('should return 0 for empty string', () => {
    const result = parseDateFlag('');
    expect(result).toBe(0);
  });

  it('should throw error for invalid date', () => {
    expect(() => parseDateFlag('invalid-date')).toThrow(/Unable to parse date/);
  });
});

describe('parseDateFlagOrUndefined', () => {
  it('should return undefined for empty string', () => {
    const result = parseDateFlagOrUndefined('');
    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    const result = parseDateFlagOrUndefined(undefined);
    expect(result).toBeUndefined();
  });

  it('should parse valid date', () => {
    const result = parseDateFlagOrUndefined('2024-01-01');
    expect(result).toBe(1704067200000);
  });
});
