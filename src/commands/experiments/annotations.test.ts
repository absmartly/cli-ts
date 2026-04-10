import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { annotationsCommand } from './annotations.js';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
} from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return {
    ...actual,
    getAPIClientFromOptions: vi.fn(),
    getGlobalOptions: vi.fn(),
    printFormatted: vi.fn(),
  };
});

describe('experiments annotations', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listAnnotations: vi.fn(),
    createAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    archiveAnnotation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(annotationsCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    vi.mocked(printFormatted).mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('list', () => {
    it('should list annotations for an experiment', async () => {
      mockClient.listAnnotations.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await annotationsCommand.parseAsync(['node', 'test', 'list', '42']);

      expect(mockClient.listAnnotations).toHaveBeenCalledWith(42);
      expect(printFormatted).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }], expect.any(Object));
    });
  });

  describe('create', () => {
    it('should create an annotation', async () => {
      mockClient.createAnnotation.mockResolvedValue({ id: 10 });

      await annotationsCommand.parseAsync(['node', 'test', 'create', '42', '--type', 'deployment']);

      expect(mockClient.createAnnotation).toHaveBeenCalledWith({
        experiment_id: 42,
        type: 'deployment',
      });
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Annotation created');
    });

    it('should create annotation without type', async () => {
      mockClient.createAnnotation.mockResolvedValue({ id: 10 });

      await annotationsCommand.parseAsync(['node', 'test', 'create', '42']);

      expect(mockClient.createAnnotation).toHaveBeenCalledWith({ experiment_id: 42 });
    });
  });

  describe('update', () => {
    it('should update an annotation', async () => {
      mockClient.updateAnnotation.mockResolvedValue({ id: 10, type: 'updated' });

      await annotationsCommand.parseAsync(['node', 'test', 'update', '10', '--type', 'updated']);

      expect(mockClient.updateAnnotation).toHaveBeenCalledWith(10, { type: 'updated' });
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Annotation 10 updated');
    });
  });

  describe('archive', () => {
    it('should archive an annotation', async () => {
      mockClient.archiveAnnotation.mockResolvedValue(undefined);

      await annotationsCommand.parseAsync(['node', 'test', 'archive', '10']);

      expect(mockClient.archiveAnnotation).toHaveBeenCalledWith(10, false);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Annotation 10 archived');
    });

    it('should unarchive an annotation with --unarchive flag', async () => {
      mockClient.archiveAnnotation.mockResolvedValue(undefined);

      await annotationsCommand.parseAsync(['node', 'test', 'archive', '10', '--unarchive']);

      expect(mockClient.archiveAnnotation).toHaveBeenCalledWith(10, true);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Annotation 10 unarchived');
    });
  });
});
