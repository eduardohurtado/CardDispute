import { describe, expect, it } from 'vitest';
import { analystQueueMeta, assessmentOutcomeMeta, matchKindMeta } from '@/components/analyst/meta';
import { ANALYST_QUEUES, MATCH_KINDS } from '@/types/analyst';

describe('analyst meta', () => {
  it('labels every queue', () => {
    for (const queue of ANALYST_QUEUES) {
      expect(analystQueueMeta[queue].label).not.toBe('');
      expect(analystQueueMeta[queue].description).not.toBe('');
    }
  });

  it('labels every match kind', () => {
    for (const matchKind of MATCH_KINDS) {
      expect(matchKindMeta[matchKind].label).not.toBe('');
      expect(matchKindMeta[matchKind].tone).toBeTruthy();
    }
  });

  it('labels every assessment outcome', () => {
    for (const outcome of ['SUPPORTED', 'NOT_SUPPORTED', 'MANUAL_REVIEW'] as const) {
      expect(assessmentOutcomeMeta[outcome].label).not.toBe('');
      expect(assessmentOutcomeMeta[outcome].tone).toBeTruthy();
    }
  });
});
