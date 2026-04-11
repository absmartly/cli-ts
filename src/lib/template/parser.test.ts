import { describe, it, expect } from 'vitest';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { parseExperimentFile } from './parser.js';

describe('Template Parser', () => {
  const testFile = join(process.cwd(), 'test-template.md');

  afterEach(() => {
    if (require('fs').existsSync(testFile)) {
      unlinkSync(testFile);
    }
  });

  it('should parse basic experiment fields', () => {
    const content = `
## Basic Info

name: test_experiment
display_name: Test Experiment
type: test
state: created

## Traffic

percentage_of_traffic: 75
percentages: 60/40
`;

    writeFileSync(testFile, content, 'utf8');
    const template = parseExperimentFile(testFile);

    expect(template.name).toBe('test_experiment');
    expect(template.display_name).toBe('Test Experiment');
    expect(template.type).toBe('test');
    expect(template.state).toBe('created');
  });

  it('should parse variants', () => {
    const content = `
## Variants

### variant_0

name: control
config: {"description": "Control"}

---

### variant_1

name: treatment
config: {"description": "Treatment"}
`;

    writeFileSync(testFile, content, 'utf8');
    const template = parseExperimentFile(testFile);

    expect(template.variants).toBeDefined();
    expect(template.variants?.length).toBe(2);
    expect(template.variants?.[0].name).toBe('control');
    expect(template.variants?.[1].name).toBe('treatment');
  });

  it('should use defaults for missing fields', () => {
    const content = `## Basic Info\n\nname: minimal_test`;

    writeFileSync(testFile, content, 'utf8');
    const template = parseExperimentFile(testFile);

    expect(template.type).toBe('test');
    expect(template.percentages).toBe('50/50');
    expect(template.custom_fields).toBeDefined();
  });

  it('should correctly parse variant numbers with radix 10', () => {
    const content = `
## Variants

### variant_08

name: variant_with_leading_zero

---

### variant_09

name: another_variant
`;

    writeFileSync(testFile, content, 'utf8');
    const template = parseExperimentFile(testFile);

    expect(template.variants).toBeDefined();
    expect(template.variants?.[0].variant).toBe(8);
    expect(template.variants?.[1].variant).toBe(9);
  });
});
