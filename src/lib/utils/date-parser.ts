const RELATIVE_PATTERN = /^(\d+)\s*(m|min|minutes?|h|hours?|d|days?|w|weeks?|mo|months?|y|years?)\s*(ago)?$/i;

const RELATIVE_KEYWORDS: Record<string, number> = {
  now: 0,
  today: 0,
  yesterday: 24 * 60 * 60 * 1000,
};

const UNIT_MS: Record<string, number> = {
  m: 60 * 1000,
  min: 60 * 1000,
  minute: 60 * 1000,
  minutes: 60 * 1000,
  h: 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
  mo: 30 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  months: 30 * 24 * 60 * 60 * 1000,
  y: 365 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
  years: 365 * 24 * 60 * 60 * 1000,
};

function parseRelativeDate(input: string): number | null {
  const lower = input.trim().toLowerCase();

  if (lower in RELATIVE_KEYWORDS) {
    return Date.now() - RELATIVE_KEYWORDS[lower]!;
  }

  const match = RELATIVE_PATTERN.exec(lower);
  if (!match) return null;

  const amount = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const ms = UNIT_MS[unit];
  if (!ms) return null;

  return Date.now() - amount * ms;
}

export function parseDateFlag(dateStr: string): number {
  if (!dateStr) return 0;

  const asNumber = parseInt(dateStr, 10);
  if (!isNaN(asNumber) && asNumber > 0 && dateStr === asNumber.toString()) {
    return asNumber;
  }

  const relative = parseRelativeDate(dateStr);
  if (relative !== null) return relative;

  const isoPattern = /^\d{4}-\d{2}-\d{2}(T[\d:.-]+Z)?$/;
  if (!isoPattern.test(dateStr)) {
    throw new Error(
      `Invalid date format: "${dateStr}"\n` +
      `Expected formats:\n` +
      `  - Relative: 7d, 2w, 30d ago, yesterday, today\n` +
      `  - ISO 8601 date: 2024-01-01\n` +
      `  - ISO 8601 datetime: 2024-01-01T00:00:00Z\n` +
      `  - Milliseconds since epoch: 1704067200000\n` +
      `\n` +
      `Relative units: m (minutes), h (hours), d (days), w (weeks), mo (months), y (years)`
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
