/** Central list of app URLs. Use these instead of hard-coded strings. */
export const paths = {
  home: '/',
  disputes: '/disputes',
  newDispute: '/disputes/new',
  dispute: '/disputes/:id',
  analyst: '/analyst',
  analystTask: '/analyst/tasks/:taskId',
} as const;

/** Builds the URL of a single case. */
export function disputePath(disputeId: string): string {
  return paths.dispute.replace(':id', encodeURIComponent(disputeId));
}

/** Builds the URL of a single analyst task. */
export function analystTaskPath(taskId: string): string {
  return paths.analystTask.replace(':taskId', encodeURIComponent(taskId));
}
