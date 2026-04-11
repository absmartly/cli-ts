import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('should accept ISO date with milliseconds', () => {
    const result = parseDateFlag('2024-01-01T00:00:00.000Z');
    expect(result).toBe(1704067200000);
  });

  it('should return 0 for empty string', () => {
    const result = parseDateFlag('');
    expect(result).toBe(0);
  });

  describe('relative dates', () => {
    const NOW = 1711000000000;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should parse "today" as current time', () => {
      expect(parseDateFlag('today')).toBe(NOW);
    });

    it('should parse "now" as current time', () => {
      expect(parseDateFlag('now')).toBe(NOW);
    });

    it('should parse "yesterday" as 24h ago', () => {
      expect(parseDateFlag('yesterday')).toBe(NOW - 24 * 60 * 60 * 1000);
    });

    it('should parse "7d" as 7 days ago', () => {
      expect(parseDateFlag('7d')).toBe(NOW - 7 * 24 * 60 * 60 * 1000);
    });

    it('should parse "7d ago" as 7 days ago', () => {
      expect(parseDateFlag('7d ago')).toBe(NOW - 7 * 24 * 60 * 60 * 1000);
    });

    it('should parse "7 days ago" as 7 days ago', () => {
      expect(parseDateFlag('7 days ago')).toBe(NOW - 7 * 24 * 60 * 60 * 1000);
    });

    it('should parse "2w" as 2 weeks ago', () => {
      expect(parseDateFlag('2w')).toBe(NOW - 14 * 24 * 60 * 60 * 1000);
    });

    it('should parse "2 weeks ago" as 2 weeks ago', () => {
      expect(parseDateFlag('2 weeks ago')).toBe(NOW - 14 * 24 * 60 * 60 * 1000);
    });

    it('should parse "1mo" as 30 days ago', () => {
      expect(parseDateFlag('1mo')).toBe(NOW - 30 * 24 * 60 * 60 * 1000);
    });

    it('should parse "3 months ago" as 90 days ago', () => {
      expect(parseDateFlag('3 months ago')).toBe(NOW - 90 * 24 * 60 * 60 * 1000);
    });

    it('should parse "1y" as 365 days ago', () => {
      expect(parseDateFlag('1y')).toBe(NOW - 365 * 24 * 60 * 60 * 1000);
    });

    it('should parse "24h" as 24 hours ago', () => {
      expect(parseDateFlag('24h')).toBe(NOW - 24 * 60 * 60 * 1000);
    });

    it('should parse "30m" as 30 minutes ago', () => {
      expect(parseDateFlag('30m')).toBe(NOW - 30 * 60 * 1000);
    });

    it('should be case-insensitive', () => {
      expect(parseDateFlag('7D')).toBe(NOW - 7 * 24 * 60 * 60 * 1000);
      expect(parseDateFlag('Yesterday')).toBe(NOW - 24 * 60 * 60 * 1000);
      expect(parseDateFlag('TODAY')).toBe(NOW);
    });
  });

  describe('error handling', () => {
    it('should throw for invalid date format', () => {
      expect(() => parseDateFlag('invalid-date')).toThrow(/Invalid date format/);
    });

    it('should throw for ambiguous MM/DD/YYYY format', () => {
      expect(() => parseDateFlag('01/15/2024')).toThrow(/Invalid date format/);
    });

    it('should throw for DD-MM-YYYY format', () => {
      expect(() => parseDateFlag('15-01-2024')).toThrow(/Invalid date format/);
    });

    it('should throw for date without leading zeros', () => {
      expect(() => parseDateFlag('2024-1-1')).toThrow(/Invalid date format/);
    });

    it('should throw for ISO timestamp without Z', () => {
      expect(() => parseDateFlag('2024-01-01T00:00:00')).toThrow(/Invalid date format/);
    });

    it('should show relative formats in error message', () => {
      try {
        parseDateFlag('bad');
        throw new Error('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('7d');
        expect(message).toContain('yesterday');
        expect(message).toContain('ISO 8601');
      }
    });
  });
});

describe('parseDateFlagOrUndefined', () => {
  it('should return undefined for empty string', () => {
    expect(parseDateFlagOrUndefined('')).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(parseDateFlagOrUndefined(undefined)).toBeUndefined();
  });

  it('should parse valid date', () => {
    expect(parseDateFlagOrUndefined('2024-01-01')).toBe(1704067200000);
  });
});
