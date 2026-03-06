import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupCommand } from './index.js';
import { setProfile } from '../../lib/config/config.js';
import { setAPIKey } from '../../lib/config/keyring.js';
import { createAPIClient } from '../../lib/api/client.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

const { mockQuestion, mockClose } = vi.hoisted(() => ({
  mockQuestion: vi.fn(),
  mockClose: vi.fn(),
}));

vi.mock('readline/promises', () => ({
  createInterface: vi.fn().mockReturnValue({ question: mockQuestion, close: mockClose }),
}));
vi.mock('../../lib/config/config.js', () => ({ setProfile: vi.fn() }));
vi.mock('../../lib/config/keyring.js', () => ({ setAPIKey: vi.fn() }));
vi.mock('../../lib/api/client.js', () => ({ createAPIClient: vi.fn() }));

describe('setup command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(setupCommand);
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

  it('should complete setup with valid inputs', async () => {
    mockQuestion
      .mockResolvedValueOnce('test-key')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('production');

    vi.mocked(createAPIClient).mockReturnValue({
      listApplications: vi.fn().mockResolvedValue([]),
    } as any);
    vi.mocked(setAPIKey).mockResolvedValue(undefined);

    await setupCommand.parseAsync(['node', 'test']);

    expect(setAPIKey).toHaveBeenCalledWith('test-key', 'default');
    expect(setProfile).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Setup complete');
    expect(mockClose).toHaveBeenCalled();
  });

  it('should reject empty API key', async () => {
    mockQuestion.mockResolvedValueOnce('');

    try {
      await setupCommand.parseAsync(['node', 'test']);
      throw new Error('Should have thrown');
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
    }

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('API key is required');
    expect(mockClose).toHaveBeenCalled();
  });
});
