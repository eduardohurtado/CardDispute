export interface DisputeResolvedEvent {
  eventId: string;
  disputeId: string;
  correlationId: string;
  providerRef: string;
  outcome: 'SUPPORTED' | 'NOT_SUPPORTED' | 'TIMEOUT';
}
