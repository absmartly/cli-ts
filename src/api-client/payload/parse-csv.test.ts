import { describe, it, expect } from 'vitest';
import { parseCSV } from './parse-csv.js';

describe('parseCSV', () => {
  it('splits a comma-separated string', () => {
    expect(parseCSV('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('trims whitespace from values', () => {
    expect(parseCSV(' a , b ')).toEqual(['a', 'b']);
  });

  it('returns empty array for empty string', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseCSV(undefined)).toEqual([]);
  });

  it('ignores trailing comma', () => {
    expect(parseCSV('a,b,')).toEqual(['a', 'b']);
  });

  it('returns single-element array for single value', () => {
    expect(parseCSV('a')).toEqual(['a']);
  });
});
