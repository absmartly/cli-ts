import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    vi.restoreAllMocks();
    const files = ['test.png', 'test.jpg', 'test.webp'];
    for (const f of files) {
      const p = join(tmpDir, f);
      if (existsSync(p)) unlinkSync(p);
    }
  });

  describe('data URI', () => {
    it('should parse a base64 data URI', async () => {
      const result = await resolveScreenshot(`data:image/png;base64,${TINY_PNG_BASE64}`, 'control');

      expect(result).not.toBeNull();
      expect(result!.data).toBe(TINY_PNG_BASE64);
      expect(result!.content_type).toBe('image/png');
      expect(result!.file_name).toBe('control.png');
      expect(result!.file_size).toBe(TINY_PNG_BYTES.length);
    });

    it('should handle jpeg content type', async () => {
      const result = await resolveScreenshot('data:image/jpeg;base64,/9j/4AAQ', 'variant');

      expect(result).not.toBeNull();
      expect(result!.content_type).toBe('image/jpeg');
      expect(result!.file_name).toBe('variant.jpg');
    });

    it('should handle webp content type', async () => {
      const result = await resolveScreenshot('data:image/webp;base64,UklGR', 'v1');

      expect(result).not.toBeNull();
      expect(result!.content_type).toBe('image/webp');
      expect(result!.file_name).toBe('v1.webp');
    });

    it('should throw on invalid data URI format', async () => {
      await expect(resolveScreenshot('data:invalid', 'v')).rejects.toThrow('Invalid data URI');
    });
  });

  describe('file path', () => {
    it('should read a PNG file from disk', async () => {
      const filePath = join(tmpDir, 'test.png');
      writeFileSync(filePath, TINY_PNG_BYTES);

      const result = await resolveScreenshot(filePath, 'control');

      expect(result).not.toBeNull();
      expect(result!.data).toBe(TINY_PNG_BASE64);
      expect(result!.content_type).toBe('image/png');
      expect(result!.file_name).toBe('test.png');
      expect(result!.file_size).toBe(TINY_PNG_BYTES.length);
    });

    it('should detect JPEG content type from extension', async () => {
      const filePath = join(tmpDir, 'test.jpg');
      writeFileSync(filePath, Buffer.from('/9j/4AAQ', 'base64'));

      const result = await resolveScreenshot(filePath, 'control');

      expect(result).not.toBeNull();
      expect(result!.content_type).toBe('image/jpeg');
      expect(result!.file_name).toBe('test.jpg');
    });

    it('should detect WebP content type from extension', async () => {
      const filePath = join(tmpDir, 'test.webp');
      writeFileSync(filePath, Buffer.from('UklGR', 'base64'));

      const result = await resolveScreenshot(filePath, 'control');

      expect(result).not.toBeNull();
      expect(result!.content_type).toBe('image/webp');
    });

    it('should throw if file does not exist', async () => {
      await expect(resolveScreenshot('/nonexistent/file.png', 'v')).rejects.toThrow('Screenshot file not found');
    });
  });

  describe('URL', () => {
    it('should fetch image from HTTP URL', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(TINY_PNG_BYTES.buffer.slice(TINY_PNG_BYTES.byteOffset, TINY_PNG_BYTES.byteOffset + TINY_PNG_BYTES.byteLength)),
        headers: new Headers({ 'content-type': 'image/png' }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const result = await resolveScreenshot('https://example.com/images/screenshot.png', 'control');

      expect(result).not.toBeNull();
      expect(result!.data).toBe(TINY_PNG_BASE64);
      expect(result!.content_type).toBe('image/png');
      expect(result!.file_name).toBe('screenshot.png');
      expect(result!.file_size).toBe(TINY_PNG_BYTES.length);
      expect(fetch).toHaveBeenCalledWith('https://example.com/images/screenshot.png');
    });

    it('should derive filename from content-type when URL has no extension', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(TINY_PNG_BYTES.buffer.slice(TINY_PNG_BYTES.byteOffset, TINY_PNG_BYTES.byteOffset + TINY_PNG_BYTES.byteLength)),
        headers: new Headers({ 'content-type': 'image/jpeg' }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const result = await resolveScreenshot('https://example.com/api/image/12345', 'treatment');

      expect(result).not.toBeNull();
      expect(result!.file_name).toBe('treatment.jpg');
      expect(result!.content_type).toBe('image/jpeg');
    });

    it('should throw on HTTP error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      await expect(resolveScreenshot('https://example.com/missing.png', 'v')).rejects.toThrow('Failed to fetch screenshot');
    });

    it('should handle http:// URLs', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(TINY_PNG_BYTES.buffer.slice(TINY_PNG_BYTES.byteOffset, TINY_PNG_BYTES.byteOffset + TINY_PNG_BYTES.byteLength)),
        headers: new Headers({ 'content-type': 'image/png' }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const result = await resolveScreenshot('http://localhost:3000/image.png', 'v0');

      expect(result).not.toBeNull();
      expect(result!.file_name).toBe('image.png');
    });
  });

  describe('edge cases', () => {
    it('should return null for empty string', async () => {
      expect(await resolveScreenshot('', 'v')).toBeNull();
    });

    it('should return null for undefined', async () => {
      expect(await resolveScreenshot(undefined as any, 'v')).toBeNull();
    });
  });
});
