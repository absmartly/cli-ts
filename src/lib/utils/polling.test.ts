import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startPolling } from './polling.js';

describe('startPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should call onTick at the specified interval', async () => {
    const onTick = vi.fn().mockResolvedValue(undefined);
    startPolling({ intervalMs: 1000, onTick });

    expect(onTick).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(onTick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(onTick).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3000);
    expect(onTick).toHaveBeenCalledTimes(5);
  });

  it('should stop polling when stop() is called', async () => {
    const onTick = vi.fn().mockResolvedValue(undefined);
    const { stop } = startPolling({ intervalMs: 500, onTick });

    await vi.advanceTimersByTimeAsync(500);
    expect(onTick).toHaveBeenCalledTimes(1);

    stop();

    await vi.advanceTimersByTimeAsync(2000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('should call onError when onTick throws', async () => {
    const error = new Error('tick failed');
    const onTick = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    startPolling({ intervalMs: 1000, onTick, onError });

    await vi.advanceTimersByTimeAsync(1000);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should log to console.error when onTick throws and no onError is provided', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onTick = vi.fn().mockRejectedValue(new Error('something broke'));

    startPolling({ intervalMs: 1000, onTick });

    await vi.advanceTimersByTimeAsync(1000);
    expect(consoleSpy).toHaveBeenCalledWith('Polling error: something broke');
  });

  it('should handle non-Error thrown values in default error handler', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onTick = vi.fn().mockRejectedValue('string error');

    startPolling({ intervalMs: 1000, onTick });

    await vi.advanceTimersByTimeAsync(1000);
    expect(consoleSpy).toHaveBeenCalledWith('Polling error: string error');
  });

  it('should not execute tick after stop is called', async () => {
    const onTick = vi.fn().mockResolvedValue(undefined);
    const { stop } = startPolling({ intervalMs: 100, onTick });

    stop();

    await vi.advanceTimersByTimeAsync(1000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('should remove the SIGINT listener when stop() is called', () => {
    const onTick = vi.fn().mockResolvedValue(undefined);
    const listenersBefore = process.listenerCount('SIGINT');

    const { stop } = startPolling({ intervalMs: 1000, onTick });
    expect(process.listenerCount('SIGINT')).toBe(listenersBefore + 1);

    stop();
    expect(process.listenerCount('SIGINT')).toBe(listenersBefore);
  });
});
