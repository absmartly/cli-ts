import type { SourceSignal } from './types.js';

export class SourceSignalRegistry {
  private entries: SourceSignal[] = [];
  private seen = new Set<string>();

  record(covers: string, source: string): void {
    const key = `${covers} ${source}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.entries.push({ covers, source });
  }

  toArray(): SourceSignal[] {
    return [...this.entries];
  }
}
