let _forceStdinTTY: boolean | undefined;
let _forceStdoutTTY: boolean | undefined;

export function setTTYOverride(opts: { stdin?: boolean; stdout?: boolean }): void {
  _forceStdinTTY = opts.stdin;
  _forceStdoutTTY = opts.stdout;
}

export function isStdinPiped(): boolean {
  if (_forceStdinTTY !== undefined) return !_forceStdinTTY;
  return !process.stdin.isTTY;
}

export function isStdoutPiped(): boolean {
  if (_forceStdoutTTY !== undefined) return !_forceStdoutTTY;
  return !process.stdout.isTTY;
}

export async function readLinesFromStdin(): Promise<string[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks)
    .toString('utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}
