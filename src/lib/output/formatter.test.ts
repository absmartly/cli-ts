import { describe, it, expect } from 'vitest';
import { formatOutput, formatValue, truncateText } from './formatter.js';

describe('Output Formatter', () => {
  describe('formatValue', () => {
    it('should format null/undefined as empty string', () => {
      expect(formatValue(null)).toBe('');
      expect(formatValue(undefined)).toBe('');
    });

    it('should format booleans', () => {
      expect(formatValue(true)).toBe('true');
      expect(formatValue(false)).toBe('false');
    });

    it('should format numbers', () => {
      expect(formatValue(123)).toBe('123');
      expect(formatValue(0)).toBe('0');
    });

    it('should format strings', () => {
      expect(formatValue('test')).toBe('test');
    });

    it('should format arrays', () => {
      expect(formatValue([1, 2, 3])).toBe('1, 2, 3');
    });

    it('should escape pipe characters in markdown format', () => {
      expect(formatValue('value|with|pipes', { format: 'markdown' })).toBe('value\\|with\\|pipes');
    });

    it('should not escape pipes in non-markdown formats', () => {
      expect(formatValue('value|with|pipes', { format: 'table' })).toBe('value|with|pipes');
      expect(formatValue('value|with|pipes', {})).toBe('value|with|pipes');
    });

    it('should escape multiple pipes correctly', () => {
      expect(formatValue('a|b|c|d', { format: 'markdown' })).toBe('a\\|b\\|c\\|d');
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      const text = 'short';
      expect(truncateText(text)).toBe(text);
    });

    it('should truncate long text by default', () => {
      const text = 'a'.repeat(200);
      const result = truncateText(text);
      expect(result.length).toBeLessThan(text.length);
      expect(result).toContain('...');
    });

    it('should respect --full flag', () => {
      const text = 'a'.repeat(200);
      const result = truncateText(text, { full: true });
      expect(result).toBe(text);
    });

    it('should use shorter limit for --terse', () => {
      const text = 'a'.repeat(200);
      const result = truncateText(text, { terse: true });
      expect(result.length).toBeLessThan(60);
    });
  });

  describe('formatOutput', () => {
    const testData = [
      { id: 1, name: 'Test 1', value: 100 },
      { id: 2, name: 'Test 2', value: 200 },
    ];

    it('should format as JSON', () => {
      const result = formatOutput(testData, 'json');
      expect(result).toContain('"id": 1');
      expect(JSON.parse(result)).toEqual(testData);
    });

    it('should format as YAML', () => {
      const result = formatOutput(testData, 'yaml');
      expect(result).toContain('id: 1');
      expect(result).toContain('name: Test 1');
    });

    it('should format as table', () => {
      const result = formatOutput(testData, 'table');
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('value');
    });

    it('should format as markdown', () => {
      const result = formatOutput(testData, 'markdown');
      expect(result).toContain('|');
      expect(result).toContain('id');
      expect(result).toContain('Test 1');
    });

    it('should handle empty arrays', () => {
      const result = formatOutput([], 'table');
      expect(result).toContain('No results found');
    });

    it('should format single objects', () => {
      const result = formatOutput({ id: 1, name: 'Test' }, 'json');
      expect(result).toContain('"id": 1');
    });
  });
});
