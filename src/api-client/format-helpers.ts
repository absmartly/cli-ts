import chalk from 'chalk';

export function formatDate(date: unknown): string {
  if (!date || (typeof date !== 'string' && typeof date !== 'number')) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString();
}

export function formatDateTime(date: unknown): string {
  if (!date || (typeof date !== 'string' && typeof date !== 'number')) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleString();
}

export function colorByEffect(text: string, impact: number, effect?: string): string {
  if (effect === 'negative') {
    return impact < 0 ? chalk.green(text) : impact > 0 ? chalk.red(text) : text;
  }
  if (effect === 'positive') {
    return impact > 0 ? chalk.green(text) : impact < 0 ? chalk.red(text) : text;
  }
  if (effect === 'unknown') return chalk.magenta(text);
  return chalk.gray(text);
}

export function colorCIInterval(
  bar: string,
  lower: number | null,
  upper: number | null,
  effect?: string
): string {
  if (!bar || lower === null || upper === null) return bar;
  if (Math.sign(lower) !== Math.sign(upper)) return bar;
  const direction = lower > 0;
  let color: (t: string) => string;
  if (!effect || effect === 'unknown') {
    color = chalk.magenta;
  } else {
    const expected = effect === 'positive';
    color = direction === expected ? chalk.green : chalk.red;
  }
  return bar.replace(/[═●]+/g, (match) => color(match));
}

export function formatImpactWithCI(
  impact: number,
  lower: number | null,
  upper: number | null,
  options?: { effect?: string; ciBar?: boolean }
): string {
  const crossesZero = lower !== null && upper !== null && Math.sign(lower) !== Math.sign(upper);
  const pctText = crossesZero
    ? formatPct(impact)
    : colorByEffect(formatPct(impact), impact, options?.effect);

  if (lower === null || upper === null) return pctText;

  if (options?.ciBar) {
    const bar = renderCIBar(lower, upper, impact);
    return `${pctText} ${colorCIInterval(bar, lower, upper, options?.effect)}`;
  }

  const ciText = `[${formatPct(lower)}, ${formatPct(upper)}]`;
  const coloredCI = crossesZero ? ciText : colorByEffect(ciText, impact, options?.effect);
  return `${pctText} ${coloredCI}`;
}

export function formatExtraField(key: string, value: unknown): unknown {
  if (key === 'experiment_report' && typeof value === 'object' && value !== null) {
    const report = value as Record<string, unknown>;
    const parts: string[] = [];
    if (report.type) parts.push(String(report.type));
    if (report.stop_reason) parts.push(String(report.stop_reason));
    if (report.full_on_variant !== null && report.full_on_variant !== undefined) {
      parts.push(`variant ${report.full_on_variant}`);
    }
    return parts.join(' / ') || '';
  }
  return value;
}

export function formatImpact(exp: Record<string, unknown>, ciBar = false): string {
  const previewVariants = exp.preview_variants as Array<Record<string, unknown>> | undefined;
  if (!previewVariants || previewVariants.length === 0) return '';

  const confidenceVariant = (exp.confidence_variant as number) ?? 1;
  const result = previewVariants.find((v) => v.variant === confidenceVariant);
  if (!result) return '';

  const impact = result.impact as number | null;
  const impactLower = result.impact_lower as number | null;
  const impactUpper = result.impact_upper as number | null;
  if (impact === null) return '';

  return formatImpactWithCI(impact, impactLower, impactUpper, { ciBar });
}

const CI_WIDTH = 20;

export function renderCIBar(lower: number, upper: number, impact: number): string {
  const range = Math.max(Math.abs(lower), Math.abs(upper), 0.01) * 1.5;
  const min = -range;
  const max = range;

  const toPos = (v: number) =>
    Math.max(0, Math.min(CI_WIDTH - 1, Math.round(((v - min) / (max - min)) * (CI_WIDTH - 1))));

  const zeroPos = toPos(0);
  const lowerPos = toPos(lower);
  const upperPos = toPos(upper);
  const impactPos = toPos(impact);

  const chars: string[] = new Array(CI_WIDTH).fill('╌');

  chars[zeroPos] = '┊';

  for (let i = lowerPos; i <= upperPos; i++) {
    chars[i] = '═';
  }

  if (zeroPos >= lowerPos && zeroPos <= upperPos && zeroPos !== impactPos) {
    chars[zeroPos] = '┊';
  }

  chars[impactPos] = impactPos === zeroPos ? '┊' : '●';

  return chars.join('');
}

export function formatConfidence(exp: Record<string, unknown>): string {
  const previewVariants = exp.preview_variants as Array<Record<string, unknown>> | undefined;
  if (!previewVariants || previewVariants.length === 0) return '';

  const confidenceVariant = (exp.confidence_variant as number) ?? 1;
  const result = previewVariants.find((v) => v.variant === confidenceVariant);
  if (!result) return '';

  const pvalue = result.pvalue as number | null;
  if (pvalue === null) return '';

  return formatConfidenceValue(pvalue);
}

export function formatProgress(exp: Record<string, unknown>): string {
  const gsa = exp.group_sequential_analyses as Array<unknown> | undefined;
  const gsaCount = exp.group_sequential_analysis_count as number | undefined;

  if (gsa && gsa.length > 0) {
    const total = gsaCount ?? gsa.length;
    return `${gsa.length}/${total}`;
  }

  const power = exp.power as Record<string, unknown> | undefined;
  if (power?.power_estimate !== undefined && power.power_estimate !== null) {
    const estimate = Number(power.power_estimate) * 100;
    return `${estimate.toFixed(0)}%`;
  }

  return '';
}

export function formatPct(value: number): string {
  const pct = value * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

export function formatConfidenceValue(pvalue: number): string {
  const confidence = Math.min((1 - pvalue) * 100, 99.99);
  const decimals = confidence >= 99.9 ? 2 : 1;
  return `${confidence.toFixed(decimals)}%`;
}

export function formatOwnerName(owner: Record<string, unknown>): string {
  const user = owner.user as Record<string, unknown> | undefined;
  if (user)
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || `user ${owner.user_id}`;
  return `user ${owner.user_id}`;
}

export function formatOwnerLabel(owner: Record<string, unknown>): string {
  const user = owner.user as Record<string, unknown> | undefined;
  if (user?.first_name && user?.email) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return `${name} <${user.email}>`;
  }
  return `user ${owner.user_id}`;
}
