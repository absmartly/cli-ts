import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTemplateCommand } from './generate-template.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { generateTemplateFromClient } from '../../lib/template/generator.js';
import { writeFileSync } from 'fs';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});
vi.mock('../../lib/template/generator.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/template/generator.js')>();
  return { ...actual, generateTemplateFromClient: vi.fn().mockResolvedValue('# Template Content') };
});
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, writeFileSync: vi.fn() };
});

describe('generate-template command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {};

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(generateTemplateCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
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

  it('should output template to stdout', async () => {
    await generateTemplateCommand.parseAsync(['node', 'test']);

    expect(generateTemplateFromClient).toHaveBeenCalledWith(mockClient, {
      name: 'My Experiment',
      type: 'test',
    });
    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Template Content');
  });

  it('should write to file with --output', async () => {
    await generateTemplateCommand.parseAsync(['node', 'test', '-o', '/tmp/t.md']);

    expect(writeFileSync).toHaveBeenCalledWith('/tmp/t.md', '# Template Content', 'utf8');
  });

  it('should pass custom name and type', async () => {
    await generateTemplateCommand.parseAsync(['node', 'test', '--name', 'X', '--type', 'feature']);

    expect(generateTemplateFromClient).toHaveBeenCalledWith(mockClient, {
      name: 'X',
      type: 'feature',
    });
  });
});
