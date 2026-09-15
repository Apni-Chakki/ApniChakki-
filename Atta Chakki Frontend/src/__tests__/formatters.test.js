import { describe, it, expect } from 'vitest';
import { formatPKR, formatPhone, formatOrderId, truncate } from '../lib/formatters';

describe('formatters utility suite', () => {
  it('formatPKR formats numeric amounts correctly', () => {
    expect(formatPKR(1500)).toBe('Rs 1,500');
    expect(formatPKR(0)).toBe('Rs 0');
    expect(formatPKR(null)).toBe('Rs 0');
    expect(formatPKR(undefined)).toBe('Rs 0');
    expect(formatPKR('not-a-number')).toBe('Rs 0');
  });

  it('formatPKR supports decimal option', () => {
    expect(formatPKR(150.5, { decimals: true })).toBe('Rs 150.50');
  });

  it('formatPhone formats Pakistani mobile numbers', () => {
    expect(formatPhone('03001234567')).toBe('0300-1234567');
    expect(formatPhone('923001234567')).toBe('+92 300-1234567');
  });

  it('formatOrderId pads order ids with leading zeros', () => {
    expect(formatOrderId(42)).toBe('#00042');
    expect(formatOrderId(12345)).toBe('#12345');
    expect(formatOrderId(null)).toBe('');
  });

  it('truncate shortens strings with ellipsis', () => {
    expect(truncate('Hello World', 5)).toBe('Hell…');
    expect(truncate('Short', 10)).toBe('Short');
  });
});

