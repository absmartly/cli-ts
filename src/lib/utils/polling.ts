export interface PollOptions {
  intervalMs: number;
  onTick: () => Promise<void>;
  onError?: (error: unknown) => void;
}

export function startPolling(options: PollOptions): { stop: () => void } {
  let running = true;

  const tick = async () => {
    if (!running) return;
    try {
      await options.onTick();
    } catch (error) {
      if (options.onError) options.onError(error);
      else console.error(`Polling error: ${error instanceof Error ? error.message : error}`);
    }
  };

  const timer = setInterval(tick, options.intervalMs);

  const stop = () => {
    running = false;
    clearInterval(timer);
  };

  const onSigint = () => {
    stop();
    process.exit(0);
  };
  process.once('SIGINT', onSigint);

  return { stop };
}
