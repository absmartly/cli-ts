import matter from 'gray-matter';

export interface VariantTemplate {
  variant?: number;
  name: string;
  config?: string;
  screenshot?: string;
  screenshot_id?: number;
  screenshot_label?: string;
}

export interface ExperimentTemplate {
  name?: string;
  display_name?: string;
  type?: string;
  state?: string;
  percentage_of_traffic?: number;
  percentages?: string;
  unit_type?: string;
  application?: string;
  primary_metric?: string;
  secondary_metrics?: string[];
  guardrail_metrics?: string[];
  exploratory_metrics?: string[];
  owners?: string[];
  owner_id?: number;
  teams?: string[];
  tags?: string[];
  audience?: string;
  variants?: VariantTemplate[];
  custom_fields?: Record<string, string>;
  analysis_type?: string;
  required_alpha?: string;
  required_power?: string;
  baseline_participants?: string;
  minimum_detectable_effect?: string;
  baseline_primary_metric_mean?: string;
  baseline_primary_metric_stdev?: string;
  group_sequential_futility_type?: string;
  group_sequential_analysis_count?: string;
  group_sequential_min_analysis_interval?: string;
  group_sequential_first_analysis_interval?: string;
  group_sequential_max_duration_interval?: string;
  note?: string;
}

export function parseExperimentMarkdown(content: string): ExperimentTemplate {
  let data: Record<string, unknown>;
  let markdownContent: string;
  try {
    const parsed = matter(content);
    data = parsed.data;
    markdownContent = parsed.content;
  } catch (error) {
    throw new Error(
      `Invalid YAML frontmatter in template content\n` +
      `${error instanceof Error ? error.message : error}`
    );
  }

  const template: ExperimentTemplate = {
    type: 'test',
    percentages: '50/50',
    variants: [],
    custom_fields: {},
  };

  const sections: Record<string, string> = {};
  let currentSection = '';
  const lines = markdownContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim();
      sections[currentSection] = '';
      continue;
    }

    if (currentSection) {
      sections[currentSection] += line + '\n';
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    (template as Record<string, unknown>)[key] = value;
  }

  const knownBodySections = new Set(['Variants', 'Audience']);

  for (const [sectionName, sectionContent] of Object.entries(sections)) {
    if (sectionName === 'Variants' && sectionContent.includes('###')) {
      template.variants = parseVariants(sectionContent);
      continue;
    }

    if (sectionName === 'Audience') {
      const jsonMatch = /```json\s*\n([\s\S]*?)\n\s*```/.exec(sectionContent);
      if (jsonMatch && jsonMatch[1]) {
        template.audience = jsonMatch[1].trim();
      }
      continue;
    }

    if (!knownBodySections.has(sectionName)) {
      if (sectionContent.includes('###')) {
        const fields = parseCustomFields(sectionContent);
        template.custom_fields = { ...template.custom_fields, ...fields };
      } else {
        const keyValuePattern = /^(\w+(?:_\w+)*):[^\S\n]*(.*)$/gm;
        let match;
        while ((match = keyValuePattern.exec(sectionContent)) !== null) {
          const matchedKey = match[1];
          const matchedValue = match[2];
          if (matchedKey) {
            const key = matchedKey.toLowerCase();
            const value = matchedValue ? matchedValue.trim() : '';
            if (value) {
              (template as Record<string, unknown>)[key] = value;
            } else {
              const listItems = parseInlineList(sectionContent, match.index + match[0].length);
              if (listItems.length > 0) {
                (template as Record<string, unknown>)[key] = listItems;
              }
            }
          }
        }
      }
    }
  }

  return template;
}

function parseInlineList(content: string, startOffset: number): string[] {
  const items: string[] = [];
  const remaining = content.slice(startOffset);
  const lines = remaining.split('\n');
  for (const line of lines) {
    const listMatch = /^[^\S\n]*-\s+(.+)$/.exec(line);
    if (listMatch && listMatch[1]) {
      items.push(listMatch[1].trim());
    } else if (line.trim() !== '') {
      break;
    }
  }
  return items;
}

function parseVariants(content: string): VariantTemplate[] {
  const variants: VariantTemplate[] = [];
  const variantPattern = /### variant_(\d+)\s*\n([\s\S]*?)(?=###|$)/g;
  let match;

  while ((match = variantPattern.exec(content)) !== null) {
    const variantNumStr = match[1];
    const variantContent = match[2];
    if (!variantNumStr || !variantContent) {
      continue;
    }

    const variantNum = parseInt(variantNumStr, 10);
    const variant: VariantTemplate = {
      variant: variantNum,
      name: `variant_${variantNum}`,
    };

    const lines = variantContent.split('\n');
    for (const line of lines) {
      const imageMatch = /^!\[([^\]]*)\]\((.+)\)$/.exec(line.trim());
      if (imageMatch) {
        const alt = imageMatch[1] ?? '';
        const path = imageMatch[2] ?? '';
        if (path) {
          variant.screenshot = path;
          if (alt) variant.screenshot_label = alt;
        }
        continue;
      }

      const keyValueMatch = /^(\w+):\s*(.*)$/.exec(line);
      if (keyValueMatch) {
        const matchedKey = keyValueMatch[1];
        const matchedValue = keyValueMatch[2];
        if (matchedKey && matchedValue) {
          const key = matchedKey.toLowerCase();
          const value = matchedValue.trim();
          if (key === 'name') variant.name = value;
          else if (key === 'config') variant.config = value;
          else if (key === 'screenshot') variant.screenshot = value;
          else if (key === 'screenshot_id') {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed)) variant.screenshot_id = parsed;
          }
        }
      }
    }

    variants.push(variant);
  }

  return variants;
}

function parseCustomFields(content: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldPattern = /### (.+?)\s*\n([\s\S]*?)(?=###|$)/g;
  let match;

  while ((match = fieldPattern.exec(content)) !== null) {
    const matchedName = match[1];
    const matchedValue = match[2];
    if (matchedName && matchedValue) {
      const fieldName = matchedName.trim();
      const fieldValue = matchedValue.trim();
      fields[fieldName] = fieldValue;
    }
  }

  return fields;
}
