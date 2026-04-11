import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../../lib/config/custom-fields-cache', () => ({
  loadCachedFields: vi.fn(),
}));

vi.mock('../../lib/config/config', () => ({
  loadConfig: vi.fn(),
}));

import { registerCustomFieldOptions, extractCustomFieldValues } from './custom-field-options.js';
import { loadCachedFields } from '../../lib/config/custom-fields-cache.js';
import { loadConfig } from '../../lib/config/config.js';

const makeField = (title: string, type: string, archived = false, sectionArchived = false) => ({
  title,
  name: title,
  archived,
  custom_section: { type, archived: sectionArchived },
});

describe('registerCustomFieldOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (loadConfig as any).mockReturnValue({ 'default-profile': 'default' });
  });

  it('should register options from cached fields', () => {
    (loadCachedFields as any).mockReturnValue([
      makeField('Hypothesis', 'experiment'),
      makeField('Owner Name', 'experiment'),
    ]);

    const cmd = new Command('test');
    registerCustomFieldOptions(cmd, 'experiment');

    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--hypothesis');
    expect(optionNames).toContain('--owner-name');
  });

  it('should add --field option', () => {
    (loadCachedFields as any).mockReturnValue([]);

    const cmd = new Command('test');
    registerCustomFieldOptions(cmd, 'experiment');

    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--field');
  });

  it('should skip archived fields', () => {
    (loadCachedFields as any).mockReturnValue([
      makeField('Active Field', 'experiment'),
      makeField('Archived Field', 'experiment', true),
    ]);

    const cmd = new Command('test');
    registerCustomFieldOptions(cmd, 'experiment');

    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--active-field');
    expect(optionNames).not.toContain('--archived-field');
  });
});

describe('extractCustomFieldValues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (loadConfig as any).mockReturnValue({ 'default-profile': 'default' });
  });

  it('should extract values from dynamic flags', () => {
    (loadCachedFields as any).mockReturnValue([makeField('Hypothesis', 'experiment')]);

    const result = extractCustomFieldValues({ hypothesis: 'My hypothesis' }, 'experiment');

    expect(result).toEqual({ Hypothesis: 'My hypothesis' });
  });

  it('should extract from --field entries (name=value format)', () => {
    (loadCachedFields as any).mockReturnValue([]);

    const result = extractCustomFieldValues(
      { field: ['Priority=High', 'Status=Active'] },
      'experiment'
    );

    expect(result).toEqual({ Priority: 'High', Status: 'Active' });
  });

  it('should ignore --field entries without =', () => {
    (loadCachedFields as any).mockReturnValue([]);

    const result = extractCustomFieldValues({ field: ['NoEquals', 'Valid=Value'] }, 'experiment');

    expect(result).toEqual({ Valid: 'Value' });
  });

  it('should use configured default profile for registration', () => {
    (loadConfig as any).mockReturnValue({ 'default-profile': 'staging' });
    (loadCachedFields as any).mockReturnValue([makeField('Deploy Target', 'experiment')]);

    const cmd = new Command('test');
    registerCustomFieldOptions(cmd, 'experiment');

    expect(loadCachedFields).toHaveBeenCalledWith('staging', 'experiment');
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--deploy-target');
  });

  it('should extract values using the specified profile', () => {
    (loadConfig as any).mockReturnValue({ 'default-profile': 'default' });
    (loadCachedFields as any).mockImplementation((profile: string) => {
      if (profile === 'test-1') return [makeField('Next Steps', 'experiment')];
      return [];
    });

    const result = extractCustomFieldValues({ nextSteps: 'Do the thing' }, 'experiment', 'test-1');

    expect(loadCachedFields).toHaveBeenCalledWith('test-1', 'experiment');
    expect(result).toEqual({ 'Next Steps': 'Do the thing' });
  });

  it('should fall back to default profile when requested profile has no cache', () => {
    (loadConfig as any).mockReturnValue({ 'default-profile': 'default' });
    (loadCachedFields as any).mockImplementation((profile: string) => {
      if (profile === 'default') return [makeField('Hypothesis', 'experiment')];
      return [];
    });

    const result = extractCustomFieldValues(
      { hypothesis: 'Test fallback' },
      'experiment',
      'missing-profile'
    );

    expect(loadCachedFields).toHaveBeenCalledWith('missing-profile', 'experiment');
    expect(loadCachedFields).toHaveBeenCalledWith('default', 'experiment');
    expect(result).toEqual({ Hypothesis: 'Test fallback' });
  });
});
