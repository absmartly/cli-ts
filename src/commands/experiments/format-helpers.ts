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

export function formatImpact(exp: Record<string, unknown>): string {
  const previewVariants = exp.preview_variants as Array<Record<string, unknown>> | undefined;
  if (!previewVariants || previewVariants.length === 0) return '';

  const confidenceVariant = (exp.confidence_variant as number) ?? 1;
  const result = previewVariants.find(v => v.variant === confidenceVariant);
  if (!result) return '';

  const impact = result.impact as number | null;
  const impactLower = result.impact_lower as number | null;
  const impactUpper = result.impact_upper as number | null;
  if (impact === null || impactLower === null || impactUpper === null) return '';

  const bar = renderCIBar(impactLower, impactUpper, impact);
  return `${formatPct(impact)} ${bar}`;
}

const CI_WIDTH = 20;

function renderCIBar(lower: number, upper: number, impact: number): string {
  const range = Math.max(Math.abs(lower), Math.abs(upper), 0.01) * 1.5;
  const min = -range;
  const max = range;

  const toPos = (v: number) => Math.max(0, Math.min(CI_WIDTH - 1, Math.round(((v - min) / (max - min)) * (CI_WIDTH - 1))));

  const zeroPos = toPos(0);
  const lowerPos = toPos(lower);
  const upperPos = toPos(upper);
  const impactPos = toPos(impact);

  const chars: string[] = new Array(CI_WIDTH).fill('╌');

  chars[zeroPos] = '┊';

  for (let i = lowerPos; i <= upperPos; i++) {
    chars[i] = '═';
  }

  chars[impactPos] = '●';

  return chars.join('');
}

export function formatConfidence(exp: Record<string, unknown>): string {
  const previewVariants = exp.preview_variants as Array<Record<string, unknown>> | undefined;
  if (!previewVariants || previewVariants.length === 0) return '';

  const confidenceVariant = (exp.confidence_variant as number) ?? 1;
  const result = previewVariants.find(v => v.variant === confidenceVariant);
  if (!result) return '';

  const pvalue = result.pvalue as number | null;
  if (pvalue === null) return '';

  const confidence = Math.min((1 - pvalue) * 100, 99.99);
  const decimals = confidence >= 99.9 ? 2 : 1;
  return `${confidence.toFixed(decimals)}%`;
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

function formatPct(value: number): string {
  const pct = value * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}
