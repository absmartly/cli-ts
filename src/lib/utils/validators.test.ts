import { describe, it, expect } from 'vitest';
import { parseId, requireAtLeastOneField, validateJSON } from './validators.js';

describe('parseId', () => {
  describe('valid inputs', () => {
    it('should parse valid positive integer', () => {
      expect(parseId('42')).toBe(42);
    });

    it('should parse single digit', () => {
      expect(parseId('1')).toBe(1);
    });

    it('should parse large number', () => {
      expect(parseId('999999')).toBe(999999);
    });

    it('should trim whitespace', () => {
      expect(parseId('  123  ')).toBe(123);
    });

    it('should handle very large numbers', () => {
      expect(parseId('999999999999999')).toBe(999999999999999);
    });
  });

  describe('invalid inputs - non-numeric', () => {
    it('should throw error for alphabetic string', () => {
      expect(() => parseId('abc')).toThrow('Invalid ID: "abc" must be a valid number');
    });

    it('should throw error for alphanumeric string (strict validation)', () => {
      expect(() => parseId('123abc')).toThrow('Invalid ID: "123abc" must be a valid number');
    });

    it('should throw error for empty string', () => {
      expect(() => parseId('')).toThrow('Invalid ID: "" must be a valid number');
    });

    it('should throw error for special characters', () => {
      expect(() => parseId('!@#')).toThrow('Invalid ID: "!@#" must be a valid number');
    });
  });

  describe('invalid inputs - negative and zero', () => {
    it('should throw error for negative number', () => {
      expect(() => parseId('-5')).toThrow('Invalid ID: -5 must be a positive integer');
    });

    it('should throw error for zero', () => {
      expect(() => parseId('0')).toThrow('Invalid ID: 0 must be a positive integer');
    });

    it('should throw error for negative zero', () => {
      expect(() => parseId('-0')).toThrow('Invalid ID: "-0" contains non-numeric characters');
    });
  });

  describe('edge cases', () => {
    it('should throw error for decimal (strict integer validation)', () => {
      expect(() => parseId('3.14')).toThrow('Invalid ID: "3.14" must be an integer (got 3.14)');
    });

    it('should throw error for number with trailing non-numeric (strict validation)', () => {
      expect(() => parseId('42extra')).toThrow('Invalid ID: "42extra" must be a valid number');
    });

    it('should handle whitespace-only string', () => {
      expect(() => parseId('   ')).toThrow('must be a valid number');
    });

    it('should throw for hex notation', () => {
      expect(() => parseId('0x10')).toThrow('contains non-numeric characters');
    });

    it('should throw error for negative decimal', () => {
      expect(() => parseId('-3.5')).toThrow('Invalid ID: "-3.5" must be an integer (got -3.5)');
    });

    it('should throw error for scientific notation', () => {
      expect(() => parseId('1e5')).toThrow('contains non-numeric characters');
    });

    it('should throw error for infinity', () => {
      expect(() => parseId('Infinity')).toThrow('must be a valid number');
    });

    it('should throw error for leading zeros', () => {
      expect(() => parseId('042')).toThrow('contains non-numeric characters');
    });
  });
});

describe('requireAtLeastOneField', () => {
  describe('valid inputs', () => {
    it('should pass when object has one field', () => {
      expect(() => requireAtLeastOneField({ name: 'test' })).not.toThrow();
    });

    it('should pass when object has multiple fields', () => {
      expect(() => requireAtLeastOneField({ name: 'test', age: 25 })).not.toThrow();
    });

    it('should pass when object has many fields', () => {
      expect(() =>
        requireAtLeastOneField({
          field1: 'a',
          field2: 'b',
          field3: 'c',
        })
      ).not.toThrow();
    });
  });

  describe('invalid inputs', () => {
    it('should throw when object is empty', () => {
      expect(() => requireAtLeastOneField({})).toThrow(
        'At least one field must be provided for update'
      );
    });

    it('should throw when all fields are undefined', () => {
      expect(() =>
        requireAtLeastOneField({
          name: undefined,
          age: undefined,
        })
      ).toThrow('At least one field must be provided for update');
    });

    it('should include help message in error', () => {
      try {
        requireAtLeastOneField({});
        throw new Error('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Use --help to see available options');
      }
    });
  });

  describe('custom field name', () => {
    it('should use custom field name in error message', () => {
      expect(() => requireAtLeastOneField({}, 'property')).toThrow(
        'At least one property must be provided for update'
      );
    });

    it('should use custom field name for update fields', () => {
      expect(() => requireAtLeastOneField({}, 'update parameter')).toThrow(
        'At least one update parameter must be provided for update'
      );
    });
  });

  describe('field filtering', () => {
    it('should ignore undefined values', () => {
      expect(() =>
        requireAtLeastOneField({
          name: undefined,
          age: undefined,
          email: undefined,
        })
      ).toThrow('At least one field must be provided');
    });

    it('should count defined values even if falsy', () => {
      expect(() =>
        requireAtLeastOneField({
          active: false,
        })
      ).not.toThrow();
    });

    it('should count null as defined', () => {
      expect(() =>
        requireAtLeastOneField({
          value: null,
        })
      ).not.toThrow();
    });

    it('should count empty string as defined', () => {
      expect(() =>
        requireAtLeastOneField({
          name: '',
        })
      ).not.toThrow();
    });

    it('should count zero as defined', () => {
      expect(() =>
        requireAtLeastOneField({
          count: 0,
        })
      ).not.toThrow();
    });
  });
});

describe('validateJSON', () => {
  describe('valid JSON', () => {
    it('should parse valid object JSON', () => {
      const result = validateJSON('{"name": "test"}');
      expect(result).toEqual({ name: 'test' });
    });

    it('should parse valid array JSON', () => {
      const result = validateJSON('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should parse nested JSON', () => {
      const result = validateJSON('{"user": {"name": "John", "age": 30}}');
      expect(result).toEqual({ user: { name: 'John', age: 30 } });
    });

    it('should parse empty object', () => {
      const result = validateJSON('{}');
      expect(result).toEqual({});
    });

    it('should parse empty array', () => {
      const result = validateJSON('[]');
      expect(result).toEqual([]);
    });

    it('should parse JSON with whitespace', () => {
      const result = validateJSON('  { "key" : "value" }  ');
      expect(result).toEqual({ key: 'value' });
    });
  });

  describe('invalid JSON', () => {
    it('should throw error for invalid syntax', () => {
      expect(() => validateJSON('{ invalid }')).toThrow(/Invalid JSON in JSON/);
    });

    it('should throw error for unclosed bracket', () => {
      expect(() => validateJSON('{"name": "test"')).toThrow(/Invalid JSON in JSON/);
    });

    it('should throw error for trailing comma', () => {
      expect(() => validateJSON('{"name": "test",}')).toThrow(/Invalid JSON in JSON/);
    });

    it('should throw error for single quotes', () => {
      expect(() => validateJSON("{'name': 'test'}")).toThrow(/Invalid JSON in JSON/);
    });

    it('should throw error for unquoted keys', () => {
      expect(() => validateJSON('{name: "test"}')).toThrow(/Invalid JSON in JSON/);
    });
  });

  describe('error messages', () => {
    it('should include error message in output', () => {
      try {
        validateJSON('{ bad json }');
        throw new Error('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Invalid JSON in JSON');
      }
    });

    it('should include input snippet (first 100 chars)', () => {
      try {
        validateJSON('{ invalid json }');
        throw new Error('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Input: { invalid json }');
      }
    });

    it('should truncate long input with ellipsis', () => {
      const longJson = '{ "key": "' + 'x'.repeat(200);
      expect(() => validateJSON(longJson)).toThrow(/\.\.\./);
      expect(() => validateJSON(longJson)).toThrow(/Input: .{100}/);
    });

    it('should not truncate short input', () => {
      try {
        validateJSON('{ bad }');
        throw new Error('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Input: { bad }');
        expect((error as Error).message).not.toContain('...');
      }
    });
  });

  describe('custom context', () => {
    it('should use custom context in error message', () => {
      expect(() => validateJSON('{ invalid }', 'variant config')).toThrow(
        /Invalid JSON in variant config/
      );
    });

    it('should use custom context for nested configs', () => {
      expect(() => validateJSON('bad', 'experiment.variants[0].config')).toThrow(
        /Invalid JSON in experiment\.variants\[0\]\.config/
      );
    });

    it('should default to "JSON" context', () => {
      try {
        validateJSON('{ bad }');
        throw new Error('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Invalid JSON in JSON');
      }
    });
  });
});
