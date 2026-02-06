export function parseDateFlag(dateStr: string): number {
  if (!dateStr) return 0;

  const asNumber = parseInt(dateStr, 10);
  if (!isNaN(asNumber) && asNumber > 0 && dateStr === asNumber.toString()) {
    return asNumber;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(
      `Unable to parse date '${dateStr}': expected milliseconds (e.g., 1704067200000) or ISO 8601 timestamp (e.g., 2024-01-01T00:00:00Z or 2024-01-01)`
    );
  }

  return date.getTime();
}

export function parseDateFlagOrUndefined(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  return parseDateFlag(dateStr);
}
