import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createListCommand } from './list-command.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from './api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';
import { setTTYOverride } from './stdin.js';
import { printPaginationFooter } from './pagination.js';

vi.mock('./api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api-helper.js')>();
  return {
    ...actual,
    getAPIClientFromOptions: vi.fn(),
    getGlobalOptions: vi.fn(),
    printFormatted: vi.fn(),
  };
});

vi.mock('./pagination.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pagination.js')>();
  return { ...actual, printPaginationFooter: vi.fn() };
});

describe('createListCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockFetch = vi.fn().mockResolvedValue([{ id: 1, name: 'item1' }]);
  const mockClient = {};

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should create a command with expected options', () => {
    const cmd = createListCommand({
      description: 'List items',
      fetch: mockFetch,
    });

    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--items');
    expect(optionNames).toContain('--page');
    // --show/--exclude/--show-only are now global (declared on the root program),
    // so they are no longer per-command options here.
    expect(optionNames).not.toContain('--show');
    expect(optionNames).not.toContain('--exclude');
  });

  it('should call fetch and printFormatted when action runs', async () => {
    const cmd = createListCommand({
      description: 'List items',
      fetch: mockFetch,
    });
    resetCommand(cmd);

    await cmd.parseAsync(['node', 'test']);

    expect(mockFetch).toHaveBeenCalledWith(mockClient, expect.any(Object));
    expect(printFormatted).toHaveBeenCalled();
  });

  it('prints a filtered total footer (not the pagination footer) when isClientFiltered returns true', async () => {
    const fetch = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const cmd = createListCommand({
      description: 'List items',
      fetch,
      isClientFiltered: () => true,
    });
    resetCommand(cmd);

    await cmd.parseAsync(['node', 'test']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('(filtered)');
    expect(printPaginationFooter).not.toHaveBeenCalled();
  });

  it('uses the pagination footer when isClientFiltered is absent', async () => {
    const fetch = vi.fn().mockResolvedValue([{ id: 1 }]);
    const cmd = createListCommand({ description: 'List items', fetch });
    resetCommand(cmd);

    await cmd.parseAsync(['node', 'test']);

    expect(printPaginationFooter).toHaveBeenCalled();
  });

  describe('output behavior under piping', () => {
    afterEach(() => {
      setTTYOverride({ stdin: true, stdout: true });
    });

    it('prints only ids when stdout is piped and no explicit output is set', async () => {
      setTTYOverride({ stdout: false });
      vi.mocked(getGlobalOptions).mockReturnValue({
        output: 'table',
        outputExplicit: false,
      } as any);
      const fetch = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const cmd = createListCommand({ description: 'List items', fetch });
      resetCommand(cmd);

      await cmd.parseAsync(['node', 'test']);

      expect(printFormatted).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(2);
      expect(consoleSpy).toHaveBeenCalledWith(3);
    });

    it('renders the requested format when stdout is piped and -o json is explicit', async () => {
      // Regression: previously `--items 200 -o json` over a pipe collapsed
      // to id-only output because the command read its local `options.output`
      // (always undefined — the flag lives on the root program), so the
      // "is explicit?" check always said no.
      setTTYOverride({ stdout: false });
      vi.mocked(getGlobalOptions).mockReturnValue({
        output: 'json',
        outputExplicit: true,
      } as any);
      const fetch = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const cmd = createListCommand({ description: 'List items', fetch });
      resetCommand(cmd);

      await cmd.parseAsync(['node', 'test']);

      expect(printFormatted).toHaveBeenCalledOnce();
      // Items must not have been spilled as bare ids on stdout.
      expect(consoleSpy).not.toHaveBeenCalledWith(1);
      expect(consoleSpy).not.toHaveBeenCalledWith(2);
    });

    it('prints only ids when output is explicitly "ids", even on a TTY', async () => {
      setTTYOverride({ stdout: true });
      vi.mocked(getGlobalOptions).mockReturnValue({
        output: 'ids',
        outputExplicit: true,
      } as any);
      const fetch = vi.fn().mockResolvedValue([{ id: 42 }]);
      const cmd = createListCommand({ description: 'List items', fetch });
      resetCommand(cmd);

      await cmd.parseAsync(['node', 'test']);

      expect(printFormatted).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(42);
    });
  });
});
