export interface DiffEntry {
  field: string;
  left: unknown;
  right: unknown;
}

export function diffExperiments(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): DiffEntry[] {
  const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const diffs: DiffEntry[] = [];
  for (const key of allKeys) {
    const l = left[key];
    const r = right[key];
    if (JSON.stringify(l) !== JSON.stringify(r)) {
      diffs.push({ field: key, left: l, right: r });
    }
  }
  return diffs;
}
