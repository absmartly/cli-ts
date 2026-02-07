export function parseDateFlag(dateStr: string): number {
  if (!dateStr) return 0;

  const asNumber = parseInt(dateStr, 10);
  if (!isNaN(asNumber) && asNumber > 0 && dateStr === asNumber.toString()) {
    return asNumber;
  }

  const isoPattern = /^\d{4}-\d{2}-\d{2}(T[\d:.-]+Z)?$/;
  if (!isoPattern.test(dateStr)) {
    throw new Error(
      `Invalid date format: "${dateStr}"\n` +
      `Expected formats:\n` +
      `  - Milliseconds since epoch: 1704067200000\n` +
      `  - ISO 8601 date: 2024-01-01\n` +
      `  - ISO 8601 datetime: 2024-01-01T00:00:00Z\n` +
      `\n` +
      `Note: Dates are interpreted as UTC. Use ISO format to avoid timezone confusion.`
    );
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: "${dateStr}" could not be parsed`);
  }

  return date.getTime();
}

export function parseDateFlagOrUndefined(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  return parseDateFlag(dateStr);
}
