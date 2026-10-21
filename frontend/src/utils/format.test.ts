import { describe, expect, it } from 'vitest';
import { formatAmount, formatDate, formatDateTime } from '@/utils/format';

describe('formatAmount', () => {
  it('formats a whole amount with its currency', () => {
    expect(formatAmount(35000, 'COP')).toBe('COP 35,000');
  });

  it('drops the decimals the blueprint wireframes omit', () => {
    expect(formatAmount(35000.5, 'COP')).toBe('COP 35,001');
  });

  it('falls back to a grouped number for an unknown currency code', () => {
    expect(formatAmount(35000, 'NOT_A_CODE')).toBe('NOT_A_CODE 35,000');
  });
});

describe('formatDate', () => {
  it('formats an ISO timestamp as a UTC date', () => {
    expect(formatDate('2026-10-09T13:05:00Z')).toBe('9 Oct 2026');
  });
});

describe('formatDateTime', () => {
  it('formats an ISO timestamp as a UTC date and time', () => {
    expect(formatDateTime('2026-10-09T13:05:00Z')).toBe('9 Oct 2026, 13:05');
  });
});
