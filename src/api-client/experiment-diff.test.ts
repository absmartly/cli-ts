import { describe, it, expect } from 'vitest';
import { diffExperiments } from './experiment-diff.js';

describe('diffExperiments', () => {
  it('should return empty array for identical objects', () => {
    const a = { id: 1, name: 'test', state: 'running' };
    const b = { id: 1, name: 'test', state: 'running' };
    expect(diffExperiments(a, b)).toEqual([]);
  });

  it('should detect changed fields', () => {
    const a = { id: 1, name: 'test', state: 'running' };
    const b = { id: 1, name: 'test', state: 'stopped' };
    const diffs = diffExperiments(a, b);
    expect(diffs).toEqual([
      { field: 'state', left: 'running', right: 'stopped' },
    ]);
  });

  it('should detect added fields', () => {
    const a = { id: 1, name: 'test' };
    const b = { id: 1, name: 'test', state: 'running' };
    const diffs = diffExperiments(a, b);
    expect(diffs).toEqual([
      { field: 'state', left: undefined, right: 'running' },
    ]);
  });

  it('should detect removed fields', () => {
    const a = { id: 1, name: 'test', state: 'running' };
    const b = { id: 1, name: 'test' };
    const diffs = diffExperiments(a, b);
    expect(diffs).toEqual([
      { field: 'state', left: 'running', right: undefined },
    ]);
  });

  it('should detect array changes', () => {
    const a = { id: 1, variants: ['control', 'treatment'] };
    const b = { id: 1, variants: ['control', 'treatment', 'treatment-b'] };
    const diffs = diffExperiments(a, b);
    expect(diffs).toEqual([
      {
        field: 'variants',
        left: ['control', 'treatment'],
        right: ['control', 'treatment', 'treatment-b'],
      },
    ]);
  });

  it('should detect nested object changes', () => {
    const a = { id: 1, config: { key: 'a', value: 1 } };
    const b = { id: 1, config: { key: 'a', value: 2 } };
    const diffs = diffExperiments(a, b);
    expect(diffs).toEqual([
      { field: 'config', left: { key: 'a', value: 1 }, right: { key: 'a', value: 2 } },
    ]);
  });

  it('should handle multiple differences', () => {
    const a = { id: 1, name: 'old', state: 'running', traffic: 50 };
    const b = { id: 1, name: 'new', state: 'stopped', traffic: 50 };
    const diffs = diffExperiments(a, b);
    expect(diffs).toHaveLength(2);
    expect(diffs.map(d => d.field)).toEqual(['name', 'state']);
  });

  it('should handle both objects being empty', () => {
    expect(diffExperiments({}, {})).toEqual([]);
  });
});
