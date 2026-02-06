import { readFileSync } from 'fs';
import matter from 'gray-matter';

export interface VariantTemplate {
  variant?: number;
  name: string;
  config?: string;
  screenshot?: string;
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
  owner_id?: number;
  variants?: VariantTemplate[];
  custom_fields?: Record<string, string>;
  analysis_type?: string;
  required_alpha?: string;
  required_power?: string;
  baseline_participants?: string;
  note?: string;
  description?: string;
  hypothesis?: string;
}

export function parseExperimentFile(filePath: string): ExperimentTemplate {
  const content = readFileSync(filePath, 'utf8');
  const { data, content: markdownContent } = matter(content);

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
    (template as any)[key] = value;
  }

  for (const [sectionName, sectionContent] of Object.entries(sections)) {
    const keyValuePattern = /^(\w+(?:_\w+)*):\s*(.*)$/gm;
    let match;

    while ((match = keyValuePattern.exec(sectionContent)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2].trim();

      if (value) {
        (template as any)[key] = value;
      }
    }

    if (sectionName === 'Variants' && sectionContent.includes('###')) {
      template.variants = parseVariants(sectionContent);
    }

    if (sectionName === 'Custom Fields') {
      template.custom_fields = parseCustomFields(sectionContent);
    }
  }

  return template;
}

function parseVariants(content: string): VariantTemplate[] {
  const variants: VariantTemplate[] = [];
  const variantPattern = /### variant_(\d+)\s*\n([\s\S]*?)(?=###|$)/g;
  let match;

  while ((match = variantPattern.exec(content)) !== null) {
    const variantNum = parseInt(match[1]);
    const variantContent = match[2];
    const variant: VariantTemplate = {
      variant: variantNum,
      name: `variant_${variantNum}`,
    };

    const lines = variantContent.split('\n');
    for (const line of lines) {
      const keyValueMatch = /^(\w+):\s*(.*)$/.exec(line);
      if (keyValueMatch) {
        const key = keyValueMatch[1].toLowerCase();
        const value = keyValueMatch[2].trim();
        if (key === 'name') variant.name = value;
        else if (key === 'config') variant.config = value;
        else if (key === 'screenshot') variant.screenshot = value;
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
    const fieldName = match[1].trim();
    const fieldValue = match[2].trim();
    fields[fieldName] = fieldValue;
  }

  return fields;
}
