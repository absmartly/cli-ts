import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { createCommand } from './create.js';
import { getAPIClientFromOptions, getGlobalOptions, resolveAPIKey } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), resolveAPIKey: vi.fn() };
});

describe('create command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    createExperiment: vi.fn().mockResolvedValue({ id: 99, name: 'test-exp', type: 'test' }),
    listCustomSectionFields: vi.fn().mockResolvedValue([]),
    listApplications: vi.fn().mockResolvedValue([]),
    listUnitTypes: vi.fn().mockResolvedValue([]),
    listMetrics: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(createCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    vi.mocked(resolveAPIKey).mockResolvedValue('test-api-key');
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

  describe('--from-file', () => {
    const tmpFile = join(process.cwd(), 'test-create-template.md');

    afterEach(() => {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    });

    it('should create experiment from template file', async () => {
      writeFileSync(tmpFile, `---
name: file-exp
display_name: File Experiment
type: test
state: created
percentage_of_traffic: 80
---

## Variants

### variant_0

name: control
config: {"color":"red"}

### variant_1

name: treatment
config: {"color":"blue"}
`, 'utf8');

      await createCommand.parseAsync(['node', 'test', '--from-file', tmpFile]);

      expect(mockClient.createExperiment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'file-exp',
          display_name: 'File Experiment',
          type: 'test',
          state: 'created',
          traffic: 80,
          variants: [
            { name: 'control', variant: 0, config: '{"color":"red"}' },
            { name: 'treatment', variant: 1, config: '{"color":"blue"}' },
          ],
        })
      );
    });

    it('should throw on invalid JSON in variant config', async () => {
      writeFileSync(tmpFile, `---
name: bad-json
---

## Variants

### variant_0

name: broken
config: {invalid json}
`, 'utf8');

      try {
        await createCommand.parseAsync(['node', 'test', '--from-file', tmpFile]);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const output = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(output).toContain('Invalid JSON in variant "broken"');
          expect(output).toContain('variant 0');
        } else {
          throw error;
        }
      }
    });

    it('should truncate long config snippets in error', async () => {
      const longConfig = '{' + 'x'.repeat(150) + '}';
      writeFileSync(tmpFile, `---
name: long-config
---

## Variants

### variant_0

name: long
config: ${longConfig}
`, 'utf8');

      try {
        await createCommand.parseAsync(['node', 'test', '--from-file', tmpFile]);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const output = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(output).toContain('...');
        } else {
          throw error;
        }
      }
    });
  });

  describe('--name', () => {
    it('should create experiment with name defaults', async () => {
      await createCommand.parseAsync(['node', 'test', '--name', 'my-exp']);

      expect(mockClient.createExperiment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-exp',
          display_name: 'my-exp',
          type: 'test',
        })
      );
    });

    it('should pass --type feature through', async () => {
      await createCommand.parseAsync(['node', 'test', '--name', 'feat-exp', '--type', 'feature']);

      expect(mockClient.createExperiment).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'feature' })
      );
    });

    it('should split --variants by comma', async () => {
      await createCommand.parseAsync(['node', 'test', '--name', 'var-exp', '--variants', 'a,b,c']);

      const call = mockClient.createExperiment.mock.calls[0][0];
      expect(call.variants).toHaveLength(3);
      expect(call.variants[0]).toEqual({ name: 'a', variant: 0, config: '{}' });
      expect(call.variants[1]).toEqual({ name: 'b', variant: 1, config: '{}' });
      expect(call.variants[2]).toEqual({ name: 'c', variant: 2, config: '{}' });
    });
  });

  it('should error when --name is missing without --from-file', async () => {
    try {
      await createCommand.parseAsync(['node', 'test']);
      throw new Error('Should have thrown');
    } catch (error) {
      if ((error as Error).message.startsWith('process.exit')) {
        const output = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(output).toContain('Missing required option: --name');
      } else {
        throw error;
      }
    }
  });

  it('should print payload with --dry-run', async () => {
    await createCommand.parseAsync(['node', 'test', '--name', 'dry-exp', '--dry-run']);

    expect(mockClient.createExperiment).not.toHaveBeenCalled();
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('dry-run');
    expect(output).toContain('dry-exp');
  });

  it('should print curl command with --as-curl', async () => {
    await createCommand.parseAsync(['node', 'test', '--name', 'curl-exp', '--as-curl']);

    expect(mockClient.createExperiment).not.toHaveBeenCalled();
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('curl');
    expect(output).toContain('curl-exp');
  });

  it('should print success message with experiment ID', async () => {
    await createCommand.parseAsync(['node', 'test', '--name', 'success-exp']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Experiment created with ID: 99');
  });
});
