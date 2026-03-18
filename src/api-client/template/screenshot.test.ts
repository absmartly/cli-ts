import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { resolveScreenshot } from './screenshot.js';

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_BYTES = Buffer.from(TINY_PNG_BASE64, 'base64');

describe('resolveScreenshot', () => {
  const tmpDir = join(process.cwd(), '.test-screenshots');

  beforeEach(() => {
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    const files = ['test.png', 'test.jpg', 'test.webp'];
    for (const f of files) {
      const p = join(tmpDir, f);
      if (existsSync(p)) unlinkSync(p);
    }
  });

  describe('data URI', () => {
    it('should parse a base64 data URI', () => {
      const result = resolveScreenshot(`data:image/png;base64,${TINY_PNG_BASE64}`, 'control');

      expect(result).not.toBeNull();
      expect(result!.data).toBe(TINY_PNG_BASE64);
      expect(result!.content_type).toBe('image/png');
      expect(result!.file_name).toBe('control.png');
      expect(result!.file_size).toBe(TINY_PNG_BYTES.length);
    });

    it('should handle jpeg content type', () => {
      const result = resolveScreenshot('data:image/jpeg;base64,/9j/4AAQ', 'variant');

      expect(result).not.toBeNull();
      expect(result!.content_type).toBe('image/jpeg');
      expect(result!.file_name).toBe('variant.jpg');
    });

    it('should handle webp content type', () => {
      const result = resolveScreenshot('data:image/webp;base64,UklGR', 'v1');

      expect(result).not.toBeNull();
      expect(result!.content_type).toBe('image/webp');
      expect(result!.file_name).toBe('v1.webp');
    });

    it('should throw on invalid data URI format', () => {
      expect(() => resolveScreenshot('data:invalid', 'v')).toThrow('Invalid data URI');
    });
  });

  describe('file path', () => {
    it('should read a PNG file from disk', () => {
      const filePath = join(tmpDir, 'test.png');
      writeFileSync(filePath, TINY_PNG_BYTES);

      const result = resolveScreenshot(filePath, 'control');

      expect(result).not.toBeNull();
      expect(result!.data).toBe(TINY_PNG_BASE64);
      expect(result!.content_type).toBe('image/png');
      expect(result!.file_name).toBe('test.png');
      expect(result!.file_size).toBe(TINY_PNG_BYTES.length);
    });

    it('should detect JPEG content type from extension', () => {
      const filePath = join(tmpDir, 'test.jpg');
      writeFileSync(filePath, Buffer.from('/9j/4AAQ', 'base64'));

      const result = resolveScreenshot(filePath, 'control');

      expect(result).not.toBeNull();
      expect(result!.content_type).toBe('image/jpeg');
      expect(result!.file_name).toBe('test.jpg');
    });

    it('should detect WebP content type from extension', () => {
      const filePath = join(tmpDir, 'test.webp');
      writeFileSync(filePath, Buffer.from('UklGR', 'base64'));

      const result = resolveScreenshot(filePath, 'control');

      expect(result).not.toBeNull();
      expect(result!.content_type).toBe('image/webp');
    });

    it('should throw if file does not exist', () => {
      expect(() => resolveScreenshot('/nonexistent/file.png', 'v')).toThrow('Screenshot file not found');
    });
  });

  describe('edge cases', () => {
    it('should return null for empty string', () => {
      expect(resolveScreenshot('', 'v')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(resolveScreenshot(undefined as any, 'v')).toBeNull();
    });
  });
});
