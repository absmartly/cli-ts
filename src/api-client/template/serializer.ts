import type { Experiment, Variant } from '../types.js';

export function experimentToMarkdown(experiment: Experiment): string {
  const exp = experiment as Record<string, unknown>;
  const parts: string[] = [];

  parts.push('---\n');
  parts.push(`name: ${experiment.name}\n`);
  if (experiment.display_name) {
    parts.push(`display_name: "${experiment.display_name}"\n`);
  }
  parts.push(`type: ${exp.type || 'test'}\n`);
  if (exp.state) parts.push(`state: ${exp.state}\n`);
  if (exp.percentage_of_traffic !== undefined) parts.push(`percentage_of_traffic: ${exp.percentage_of_traffic}\n`);
  if (exp.percentages) parts.push(`percentages: ${exp.percentages}\n`);

  const unitType = experiment.unit_type as Record<string, unknown> | undefined;
  if (unitType) parts.push(`unit_type: ${unitType.name ?? unitType.unit_type_id ?? unitType.id}\n`);

  const applications = experiment.applications as Array<Record<string, unknown>> | undefined;
  if (applications && applications.length > 0) {
    const appNames = applications.map(a => {
      const nested = a.application as Record<string, unknown> | undefined;
      return nested?.name ?? a.name ?? a.application_id;
    });
    parts.push(`application: ${appNames.join(', ')}\n`);
  }

  const primaryMetric = experiment.primary_metric as Record<string, unknown> | undefined;
  if (primaryMetric) parts.push(`primary_metric: ${primaryMetric.name ?? primaryMetric.metric_id ?? primaryMetric.id}\n`);

  const allMetrics = experiment.secondary_metrics as Array<Record<string, unknown>> | undefined;
  if (allMetrics && allMetrics.length > 0) {
    const secondaryGroup: Array<Record<string, unknown>> = [];
    const guardrailGroup: Array<Record<string, unknown>> = [];
    const exploratoryGroup: Array<Record<string, unknown>> = [];
    for (const m of allMetrics) {
      const type = m.type as string;
      if (type === 'guardrail') guardrailGroup.push(m);
      else if (type === 'exploratory') exploratoryGroup.push(m);
      else secondaryGroup.push(m);
    }
    const groups: Array<[string, Array<Record<string, unknown>>]> = [
      ['secondary_metrics', secondaryGroup],
      ['guardrail_metrics', guardrailGroup],
      ['exploratory_metrics', exploratoryGroup],
    ];
    for (const [key, metrics] of groups) {
      if (metrics.length === 0) continue;
      parts.push(`${key}:\n`);
      for (const m of metrics) {
        const metric = m.metric as Record<string, unknown> | undefined;
        parts.push(`  - ${metric?.name || m.name || m.metric_id}\n`);
      }
    }
  }

  const owners = exp.owners as Array<Record<string, unknown>> | undefined;
  if (owners && owners.length > 0) {
    const ownerIds = owners.map(o => o.user_id);
    if (ownerIds.length === 1) {
      parts.push(`owner_id: ${ownerIds[0]}\n`);
    } else {
      parts.push(`owner_ids:\n`);
      for (const id of ownerIds) parts.push(`  - ${id}\n`);
    }
  }

  const teams = exp.teams as Array<Record<string, unknown>> | undefined;
  if (teams && teams.length > 0) {
    const teamNames = teams.map(t => {
      const nested = t.team as Record<string, unknown> | undefined;
      return nested?.name ?? t.name;
    }).filter(Boolean);
    if (teamNames.length > 0) {
      parts.push(`teams:\n`);
      for (const name of teamNames) parts.push(`  - ${name}\n`);
    }
  }

  const tags = exp.experiment_tags as Array<Record<string, unknown>> | undefined;
  if (tags && tags.length > 0) {
    const tagNames = tags.map(t => {
      const nested = t.experiment_tag as Record<string, unknown> | undefined;
      return (nested?.tag as string) ?? (t.tag as Record<string, unknown>)?.name ?? t.tag;
    }).filter(Boolean);
    if (tagNames.length > 0) {
      parts.push(`tags:\n`);
      for (const name of tagNames) parts.push(`  - ${name}\n`);
    }
  }

  if (exp.analysis_type) parts.push(`analysis_type: ${exp.analysis_type}\n`);
  if (exp.required_alpha) parts.push(`required_alpha: ${exp.required_alpha}\n`);
  if (exp.required_power) parts.push(`required_power: ${exp.required_power}\n`);
  if (exp.baseline_participants_per_day) parts.push(`baseline_participants: ${exp.baseline_participants_per_day}\n`);

  parts.push('---\n');

  if (exp.audience) {
    const audienceObj = typeof exp.audience === 'string' ? JSON.parse(exp.audience) : exp.audience;
    parts.push('\n## Audience\n\n');
    parts.push('```json\n');
    parts.push(JSON.stringify(audienceObj, null, 2));
    parts.push('\n```\n');
  }

  const variants = experiment.variants as Variant[] | undefined;
  const variantScreenshots = exp.variant_screenshots as Array<Record<string, unknown>> | undefined;
  if (variants && variants.length > 0) {
    parts.push('\n## Variants\n');
    for (const v of variants) {
      const idx = v.variant ?? variants.indexOf(v);
      parts.push(`\n### variant_${idx}\n\n`);
      parts.push(`name: ${v.name || ''}\n`);
      if (v.config) {
        const configStr = typeof v.config === 'object' ? JSON.stringify(v.config) : v.config;
        parts.push(`config: ${configStr}\n`);
      }

      const screenshot = variantScreenshots?.find(s => s.variant === idx);
      if (screenshot) {
        const fileUpload = screenshot.file_upload as Record<string, unknown> | undefined;
        if (fileUpload) {
          parts.push(`screenshot: ${fileUpload.base_url}/${fileUpload.file_name}\n`);
        }
      }
    }
  }

  const customFieldValues = exp.custom_section_field_values as Array<Record<string, unknown>> | undefined;
  if (customFieldValues && customFieldValues.length > 0) {
    const nonEmpty = customFieldValues.filter(entry => {
      const field = entry.custom_section_field as Record<string, unknown> | undefined;
      return field?.title;
    }).sort((a, b) => {
      const fa = a.custom_section_field as Record<string, unknown>;
      const fb = b.custom_section_field as Record<string, unknown>;
      const sa = fa.custom_section as Record<string, unknown> | undefined;
      const sb = fb.custom_section as Record<string, unknown> | undefined;
      const sectionDiff = ((sa?.order_index as number) ?? 0) - ((sb?.order_index as number) ?? 0);
      if (sectionDiff !== 0) return sectionDiff;
      return ((fa.order_index as number) ?? 0) - ((fb.order_index as number) ?? 0);
    });
    if (nonEmpty.length > 0) {
      let currentSection = '';
      for (const entry of nonEmpty) {
        const field = entry.custom_section_field as Record<string, unknown>;
        const section = field.custom_section as Record<string, unknown> | undefined;
        const sectionTitle = (section?.title as string) || 'Custom Fields';
        const title = field.title as string;
        const value = (entry.value as string) || '';

        if (sectionTitle !== currentSection) {
          currentSection = sectionTitle;
          parts.push(`\n## ${sectionTitle}\n`);
        }

        parts.push(`\n### ${title}\n\n`);
        parts.push(`${value}\n`);
      }
    }
  }

  return parts.join('');
}
