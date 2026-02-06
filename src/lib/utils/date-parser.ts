/**
 * Parse a date string in various formats and return milliseconds since epoch.
 *
 * Supported formats:
 *   - Milliseconds since epoch: "1704067200000"
 *   - ISO 8601 UTC: "2024-01-01T00:00:00Z"
 *   - ISO 8601 with timezone: "2024-01-01T00:00:00-05:00"
 *   - Simple date (assumes UTC midnight): "2024-01-01"
 *   - RFC3339: "2024-01-01T00:00:00+00:00"
 */
export function parseDateFlag(dateStr: string): number {
  if (!dateStr) {
    return 0;
  }

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

/**
 * Parse a date string or return undefined if empty
 */
export function parseDateFlagOrUndefined(dateStr?: string): number | undefined {
  if (!dateStr) {
    return undefined;
  }
  return parseDateFlag(dateStr);
}
