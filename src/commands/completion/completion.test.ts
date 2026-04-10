import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { createCompletionCommand } from './index.js';

function buildTestProgram(): Command {
  const program = new Command();
  program
    .name('abs')
    .option('--config <path>', 'config file path')
    .option('-o, --output <format>', 'output format');

  const experiments = new Command('experiments').alias('exp').description('Experiment commands');
  experiments.addCommand(new Command('list').description('List experiments'));
  experiments.addCommand(new Command('get').description('Get experiment'));
  program.addCommand(experiments);

  const auth = new Command('auth').description('Authentication commands');
  auth.addCommand(new Command('login').description('Authenticate'));
  auth.addCommand(new Command('logout').description('Clear credentials'));
  program.addCommand(auth);

  program.addCommand(createCompletionCommand(program));
  return program;
}

describe('completion command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should output bash completion script', async () => {
    const program = buildTestProgram();
    const completionCmd = program.commands.find((c) => c.name() === 'completion')!;

    try {
      await completionCmd.parseAsync(['node', 'test', 'bash']);
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
    }

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('_abs_completions');
    expect(output).toContain('complete -F _abs_completions abs');
    expect(output).toContain('experiments');
    expect(output).toContain('auth');
    expect(output).toContain('exp)');
    expect(output).toContain('list');
    expect(output).toContain('get');
    expect(output).toContain('login');
    expect(output).toContain('logout');
    expect(output).toContain('--config');
    expect(output).toContain('--output');
  });

  it('should output zsh completion script', async () => {
    const program = buildTestProgram();
    const completionCmd = program.commands.find((c) => c.name() === 'completion')!;

    try {
      await completionCmd.parseAsync(['node', 'test', 'zsh']);
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
    }

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('#compdef abs');
    expect(output).toContain('_abs');
    expect(output).toContain('experiments:Experiment commands');
    expect(output).toContain('auth:Authentication commands');
    expect(output).toContain('list:List experiments');
    expect(output).toContain('login:Authenticate');
    expect(output).toContain('--config');
    expect(output).toContain('--output');
  });

  it('should show error for unsupported shell', async () => {
    const program = buildTestProgram();
    const completionCmd = program.commands.find((c) => c.name() === 'completion')!;

    try {
      await completionCmd.parseAsync(['node', 'test', 'fish']);
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
    }

    const errorOutput = consoleErrorSpy.mock.calls.flat().join('\n');
    expect(errorOutput).toContain('Unsupported shell: fish');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
