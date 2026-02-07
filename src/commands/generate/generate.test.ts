import { describe, it, expect } from 'vitest';

describe('Generate Command Utilities', () => {
  describe('backslash and quote escaping', () => {
    it('should escape single quotes in experiment names', () => {
      const name = "User's Test";
      const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      expect(escaped).toBe("User\\'s Test");
    });

    it('should escape backslashes in experiment names', () => {
      const name = "Test\\Name";
      const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      expect(escaped).toBe("Test\\\\Name");
    });

    it('should escape both backslashes and quotes', () => {
      const name = "User's\\Test";
      const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      expect(escaped).toBe("User\\'s\\\\Test");
    });

    it('should handle multiple backslashes', () => {
      const name = "Path\\to\\file";
      const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      expect(escaped).toBe("Path\\\\to\\\\file");
    });

    it('should handle complex mixed content', () => {
      const name = "Test\\name's\\feature";
      const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      expect(escaped).toBe("Test\\\\name\\'s\\\\feature");
    });

    it('should escape backslash before quote correctly', () => {
      const name = "\\'test";
      const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      expect(escaped).toBe("\\\\\\'test");
    });

    it('should produce correctly escaped strings for TypeScript', () => {
      const testCases = [
        { input: "Normal Name", expected: "Normal Name" },
        { input: "User's Test", expected: "User\\'s Test" },
        { input: "Test\\Path", expected: "Test\\\\Path" },
        { input: "Mixed\\test's", expected: "Mixed\\\\test\\'s" },
        { input: "'quoted'", expected: "\\'quoted\\'" },
        { input: "\\backslash\\", expected: "\\\\backslash\\\\" },
      ];

      for (const { input, expected } of testCases) {
        const escaped = input.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        expect(escaped).toBe(expected);
      }
    });

    it('should properly escape for template literal construction', () => {
      const names = ["User's Test", "Test\\Name", "Normal"];
      const escaped = names.map(name => name.replace(/\\/g, '\\\\').replace(/'/g, "\\'"));

      expect(escaped).toEqual([
        "User\\'s Test",
        "Test\\\\Name",
        "Normal"
      ]);
    });
  });

  describe('parseInt with radix', () => {
    it('should correctly parse numbers with leading zeros', () => {
      expect(parseInt('08', 10)).toBe(8);
      expect(parseInt('09', 10)).toBe(9);
      expect(parseInt('010', 10)).toBe(10);
    });

    it('should not interpret as octal', () => {
      expect(parseInt('08', 10)).not.toBe(0);
      expect(parseInt('09', 10)).not.toBe(0);
    });
  });
});
