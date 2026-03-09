import { describe, it, expect } from 'vitest';
import { requireAtLeastOneField, validateJSON } from './validators.js';

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

    it('should not include raw input in error message', () => {
      try {
        validateJSON('{ invalid json }');
        throw new Error('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Invalid JSON in JSON');
        expect((error as Error).message).not.toContain('Input:');
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
