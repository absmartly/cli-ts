import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../template/screenshot', () => ({
  resolveScreenshot: vi.fn(),
}));

import { parseScreenshotEntries } from './screenshot-parser.js';
import { resolveScreenshot } from '../template/screenshot.js';

describe('parseScreenshotEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid entry and return result with variant and file_upload', async () => {
    const fakeUpload = { id: 'upload-1', url: 'https://cdn/file.png' };
    (resolveScreenshot as any).mockResolvedValue(fakeUpload);

    const result = await parseScreenshotEntries(['0:./file.png']);

    expect(resolveScreenshot).toHaveBeenCalledWith('./file.png', 'variant_0');
    expect(result).toEqual([{ variant: 0, file_upload: fakeUpload }]);
  });

  it('should throw on invalid format without colon', async () => {
    await expect(parseScreenshotEntries(['noColon'])).rejects.toThrow(
      'Invalid --screenshot format'
    );
  });

  it('should throw on invalid variant index (NaN)', async () => {
    await expect(parseScreenshotEntries(['abc:./file.png'])).rejects.toThrow(
      'Invalid variant index'
    );
  });

  it('should skip entry when resolveScreenshot returns null', async () => {
    (resolveScreenshot as any).mockResolvedValue(null);

    const result = await parseScreenshotEntries(['0:./file.png']);

    expect(resolveScreenshot).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should use variant name from variants array if provided', async () => {
    const fakeUpload = { id: 'upload-2' };
    (resolveScreenshot as any).mockResolvedValue(fakeUpload);

    const variants = [{ name: 'control' }, { name: 'treatment' }];
    const result = await parseScreenshotEntries(['1:./img.png'], variants);

    expect(resolveScreenshot).toHaveBeenCalledWith('./img.png', 'treatment');
    expect(result).toEqual([{ variant: 1, file_upload: fakeUpload }]);
  });
});
