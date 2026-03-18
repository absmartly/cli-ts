import type { Experiment, Variant } from '../types.js';

export function experimentToMarkdown(experiment: Experiment): string {
  const parts: string[] = [];

  parts.push('---\n');
  parts.push(`name: ${experiment.name}\n`);
  if (experiment.display_name) {
    parts.push(`display_name: ${experiment.display_name}\n`);
  }
  parts.push(`type: ${(experiment as Record<string, unknown>).type || 'test'}\n`);
  if ((experiment as Record<string, unknown>).state) {
    parts.push(`state: ${(experiment as Record<string, unknown>).state}\n`);
  }
  if ((experiment as Record<string, unknown>).percentage_of_traffic !== undefined) {
    parts.push(`percentage_of_traffic: ${(experiment as Record<string, unknown>).percentage_of_traffic}\n`);
  }
  if ((experiment as Record<string, unknown>).percentages) {
    parts.push(`percentages: ${(experiment as Record<string, unknown>).percentages}\n`);
  }
  if ((experiment as Record<string, unknown>).analysis_type) {
    parts.push(`analysis_type: ${(experiment as Record<string, unknown>).analysis_type}\n`);
  }
  if ((experiment as Record<string, unknown>).required_alpha) {
    parts.push(`required_alpha: ${(experiment as Record<string, unknown>).required_alpha}\n`);
  }
  if ((experiment as Record<string, unknown>).required_power) {
    parts.push(`required_power: ${(experiment as Record<string, unknown>).required_power}\n`);
  }
  if ((experiment as Record<string, unknown>).baseline_participants_per_day) {
    parts.push(`baseline_participants: ${(experiment as Record<string, unknown>).baseline_participants_per_day}\n`);
  }

  const secondaryMetrics = experiment.secondary_metrics as Array<Record<string, unknown>> | undefined;
  const guardrailMetrics = (experiment as Record<string, unknown>).guardrail_metrics as Array<Record<string, unknown>> | undefined;
  if (secondaryMetrics && secondaryMetrics.length > 0) {
    parts.push('secondary_metrics:\n');
    for (const m of secondaryMetrics) {
      parts.push(`  - ${m.name || m.metric_id}\n`);
    }
  }
  if (guardrailMetrics && guardrailMetrics.length > 0) {
    parts.push('guardrail_metrics:\n');
    for (const m of guardrailMetrics) {
      parts.push(`  - ${m.name || m.metric_id}\n`);
    }
  }

  parts.push('---\n\n');

  const unitType = experiment.unit_type as Record<string, unknown> | undefined;
  const applications = experiment.applications as Array<Record<string, unknown>> | undefined;
  if (unitType || (applications && applications.length > 0)) {
    parts.push('## Unit & Application\n\n');
    if (unitType) {
      parts.push(`unit_type: ${unitType.name || unitType.unit_type_id}\n`);
    }
    if (applications && applications.length > 0) {
      const app = applications[0];
      parts.push(`application: ${app.name || app.application_id}\n`);
    }
    parts.push('\n');
  }

  const primaryMetric = experiment.primary_metric as Record<string, unknown> | undefined;
  if (primaryMetric) {
    parts.push('## Metrics\n\n');
    parts.push(`primary_metric: ${primaryMetric.name || primaryMetric.metric_id}\n`);
    parts.push('\n');
  }

  const variants = experiment.variants as Variant[] | undefined;
  const variantScreenshots = (experiment as Record<string, unknown>).variant_screenshots as Array<Record<string, unknown>> | undefined;
  if (variants && variants.length > 0) {
    parts.push('## Variants\n\n');
    for (const v of variants) {
      const idx = v.variant ?? variants.indexOf(v);
      parts.push(`### variant_${idx}\n\n`);
      parts.push(`name: ${v.name}\n`);
      if (v.config) {
        const configStr = typeof v.config === 'object' ? JSON.stringify(v.config) : v.config;
        parts.push(`config: ${configStr}\n`);
      }

      const screenshot = variantScreenshots?.find(
        (s) => s.variant === idx
      );
      if (screenshot) {
        const fileUpload = screenshot.file_upload as Record<string, unknown> | undefined;
        if (fileUpload) {
          const baseUrl = fileUpload.base_url as string;
          const fileName = fileUpload.file_name as string;
          parts.push(`screenshot: ${baseUrl}/${fileName}\n`);
        }
      }

      parts.push('\n');
    }
  }

  const description = (experiment as Record<string, unknown>).description as string | undefined;
  const hypothesis = (experiment as Record<string, unknown>).hypothesis as string | undefined;
  if (description || hypothesis) {
    parts.push('## Description\n\n');
    if (hypothesis) {
      parts.push(`hypothesis: ${hypothesis}\n`);
    }
    if (description) {
      parts.push(`description: ${description}\n`);
    }
    parts.push('\n');
  }

  const owners = (experiment as Record<string, unknown>).owners as Array<Record<string, unknown>> | undefined;
  if (owners && owners.length > 0) {
    parts.push(`owner_id: ${owners[0].user_id}\n`);
  }

  return parts.join('');
}
