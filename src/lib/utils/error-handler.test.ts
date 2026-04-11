import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleFatalError, BUG_REPORT_URL } from './error-handler.js';

describe('handleFatalError', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  const originalDebug = process.env.DEBUG;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
    delete process.env.DEBUG;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    if (originalDebug !== undefined) {
      process.env.DEBUG = originalDebug;
    } else {
      delete process.env.DEBUG;
    }
  });

  it('should print label and error message for Error objects', () => {
    try {
      handleFatalError('test label', new Error('something broke'));
    } catch {}

    const output = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Fatal error (test label):');
    expect(output).toContain('something broke');
  });

  it('should handle non-Error values by converting to string', () => {
    try {
      handleFatalError('crash', 'a string reason');
    } catch {}

    const output = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(output).toContain('a string reason');
  });

  it('should print stack trace when DEBUG is set', () => {
    process.env.DEBUG = '1';
    const error = new Error('debug error');

    try {
      handleFatalError('debug test', error);
    } catch {}

    const output = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Stack trace:');
    expect(output).toContain(error.stack!);
  });

  it('should not print stack trace when DEBUG is not set', () => {
    try {
      handleFatalError('no debug', new Error('plain error'));
    } catch {}

    const output = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(output).not.toContain('Stack trace:');
  });

  it('should include bug report URL in output', () => {
    try {
      handleFatalError('bug', new Error('oops'));
    } catch {}

    const output = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(output).toContain(BUG_REPORT_URL);
    expect(output).toContain('This is a bug');
  });

  it('should call process.exit(1)', () => {
    try {
      handleFatalError('exit', new Error('fatal'));
    } catch {}

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
