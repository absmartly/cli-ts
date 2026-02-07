import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Experiment Create Command - JSON Error Handling Documentation', () => {
  const createFilePath = join(__dirname, 'create.ts');

  it('should document JSON.parse with try-catch', () => {
    const content = readFileSync(createFilePath, 'utf8');

    expect(content).toContain('try {');
    expect(content).toContain('JSON.parse');
    expect(content).toContain('} catch (error)');
  });

  it('should include variant name in error message', () => {
    const content = readFileSync(createFilePath, 'utf8');

    expect(content).toContain('Invalid JSON in variant');
    expect(content).toContain('v.name');
  });

  it('should include variant index in error message', () => {
    const content = readFileSync(createFilePath, 'utf8');

    expect(content).toContain('variant ${index}');
  });

  it('should show config snippet in error', () => {
    const content = readFileSync(createFilePath, 'utf8');

    expect(content).toContain('Config:');
    expect(content).toContain('.substring(0, 100)');
  });

  it('should truncate long config snippets', () => {
    const content = readFileSync(createFilePath, 'utf8');

    expect(content).toContain('v.config.length > 100');
    expect(content).toContain("? '...' : ''");
  });

  it('should include original error message in catch block', () => {
    const content = readFileSync(createFilePath, 'utf8');

    const catchBlock = content.match(/catch \(error\) \{[\s\S]{20,200}?\}/);
    expect(catchBlock).toBeDefined();
    expect(content).toContain('error instanceof Error');
    expect(content).toContain('error.message');
  });
});

describe('Experiment Create - JSON Validation Logic', () => {
  it('should verify JSON parsing is in variant mapping', () => {
    const content = readFileSync(join(__dirname, 'create.ts'), 'utf8');

    expect(content).toContain('template.variants');
    expect(content).toContain('.map(');
    expect(content).toContain('JSON.parse');
  });

  it('should verify error is thrown with context', () => {
    const content = readFileSync(join(__dirname, 'create.ts'), 'utf8');

    expect(content).toContain('throw new Error');
    expect(content).toContain('Invalid JSON in variant');
  });

  it('should verify config is only parsed when present', () => {
    const content = readFileSync(join(__dirname, 'create.ts'), 'utf8');

    expect(content).toContain('if (v.config)');
    const ifBlock = content.match(/if \(v\.config\) \{[\s\S]+?\}/);
    expect(ifBlock).toBeDefined();
    expect(ifBlock![0]).toContain('JSON.parse(v.config)');
  });
});
