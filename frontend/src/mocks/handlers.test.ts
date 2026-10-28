import { describe, expect, it } from 'vitest';
import { queueOf } from '@/mocks/handlers';
import { demoAnalystTasks } from '@/mocks/fixtures';
import type { AnalystTask } from '@/types/analyst';

function taskWithDueAt(dueAt: string): AnalystTask {
  return { ...demoAnalystTasks[0], dueAt };
}

describe('queueOf', () => {
  it('puts a task that is due within a day into the due soon queue', () => {
    expect(queueOf(taskWithDueAt('2026-10-15T09:00:00Z'))).toBe('DUE_SOON');
  });

  it('puts an overdue task into the due soon queue', () => {
    expect(queueOf(taskWithDueAt('2026-10-14T10:00:00Z'))).toBe('DUE_SOON');
  });
});
