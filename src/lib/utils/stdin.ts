export function isStdinPiped(): boolean {
  return process.stdin.isTTY === false;
}

export function isStdoutPiped(): boolean {
  return process.stdout.isTTY === false;
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
