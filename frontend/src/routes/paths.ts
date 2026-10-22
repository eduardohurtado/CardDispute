/** Central list of app URLs. Use these instead of hard-coded strings. */
export const paths = {
  home: '/',
  disputes: '/disputes',
  newDispute: '/disputes/new',
  dispute: '/disputes/:id',
} as const;

/** Builds the URL of a single case. */
export function disputePath(disputeId: string): string {
  return paths.dispute.replace(':id', encodeURIComponent(disputeId));
}
