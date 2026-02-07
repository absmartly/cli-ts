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

  it('should return 0 for empty string', () => {
    const result = parseDateFlag('');
    expect(result).toBe(0);
  });

  it('should throw error for invalid date format (non-ISO)', () => {
    expect(() => parseDateFlag('invalid-date')).toThrow(/Invalid date format/);
  });

  it('should throw error for ambiguous date format (MM/DD/YYYY)', () => {
    expect(() => parseDateFlag('01/15/2024')).toThrow(/Invalid date format/);
  });

  it('should throw error for ambiguous date format (DD-MM-YYYY)', () => {
    expect(() => parseDateFlag('15-01-2024')).toThrow(/Invalid date format/);
  });

  it('should throw error for date without leading zeros', () => {
    expect(() => parseDateFlag('2024-1-1')).toThrow(/Invalid date format/);
  });

  it('should throw error for ISO timestamp without Z', () => {
    expect(() => parseDateFlag('2024-01-01T00:00:00')).toThrow(/Invalid date format/);
  });

  it('should throw error for human-readable format', () => {
    expect(() => parseDateFlag('January 1, 2024')).toThrow(/Invalid date format/);
  });

  it('should throw error for relative dates', () => {
    expect(() => parseDateFlag('yesterday')).toThrow(/Invalid date format/);
  });

  it('should accept ISO date with milliseconds', () => {
    const result = parseDateFlag('2024-01-01T00:00:00.000Z');
    expect(result).toBe(1704067200000);
  });

  it('should show helpful error message with expected formats', () => {
    try {
      parseDateFlag('01/15/2024');
      throw new Error('Should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('Milliseconds since epoch');
      expect(message).toContain('ISO 8601 date');
      expect(message).toContain('ISO 8601 datetime');
      expect(message).toContain('UTC');
    }
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
