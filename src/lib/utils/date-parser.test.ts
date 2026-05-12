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

  it('should parse simple date as local midnight', () => {
    const result = parseDateFlag('2024-01-01');
    expect(result).toBe(new Date(2024, 0, 1).getTime());
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
    // 2024-03-21T08:26:40Z — mid-day UTC, so the local calendar day is
    // 2024-03-21 in any reasonable TZ.
    const NOW = 1711010000000;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should parse "today" as local midnight today', () => {
      const n = new Date(NOW);
      expect(parseDateFlag('today')).toBe(
        new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()
      );
    });

    it('should parse "now" as current time', () => {
      expect(parseDateFlag('now')).toBe(NOW);
    });

    it('should parse "yesterday" as local midnight yesterday', () => {
      const n = new Date(NOW);
      expect(parseDateFlag('yesterday')).toBe(
        new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1).getTime()
      );
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
      const n = new Date(NOW);
      const todayStart = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
      const yesterdayStart = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1).getTime();
      expect(parseDateFlag('7D')).toBe(NOW - 7 * 24 * 60 * 60 * 1000);
      expect(parseDateFlag('Yesterday')).toBe(yesterdayStart);
      expect(parseDateFlag('TODAY')).toBe(todayStart);
    });
  });

  describe('calendar keywords', () => {
    // 2026-05-12T14:23:45Z — a Tuesday mid-month (safe for any reasonable TZ
    // to still report May 12 locally).
    const NOW = Date.UTC(2026, 4, 12, 14, 23, 45);

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('parses "month-start" as 00:00 local on the 1st of the current month', () => {
      expect(parseDateFlag('month-start')).toBe(new Date(2026, 4, 1).getTime());
    });

    it('parses "last-month-start" as 00:00 local on the 1st of the previous month', () => {
      expect(parseDateFlag('last-month-start')).toBe(new Date(2026, 3, 1).getTime());
    });

    it('parses "last-month-end" as 1ms before the start of the current month', () => {
      expect(parseDateFlag('last-month-end')).toBe(new Date(2026, 4, 1).getTime() - 1);
    });

    it('handles January correctly for last-month-start (rolls to December of previous year)', () => {
      vi.setSystemTime(Date.UTC(2026, 0, 15, 12));
      expect(parseDateFlag('last-month-start')).toBe(new Date(2025, 11, 1).getTime());
      expect(parseDateFlag('last-month-end')).toBe(new Date(2026, 0, 1).getTime() - 1);
    });

    it('parses "year-start" as 00:00 local on Jan 1 of the current year', () => {
      expect(parseDateFlag('year-start')).toBe(new Date(2026, 0, 1).getTime());
    });

    it('parses "last-year-start" as 00:00 local on Jan 1 of the previous year', () => {
      expect(parseDateFlag('last-year-start')).toBe(new Date(2025, 0, 1).getTime());
    });

    it('parses "last-year-end" as 1ms before the start of the current year', () => {
      expect(parseDateFlag('last-year-end')).toBe(new Date(2026, 0, 1).getTime() - 1);
    });

    it('is case-insensitive', () => {
      expect(parseDateFlag('Month-Start')).toBe(new Date(2026, 4, 1).getTime());
      expect(parseDateFlag('YEAR-START')).toBe(new Date(2026, 0, 1).getTime());
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
