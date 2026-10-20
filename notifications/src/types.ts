export interface DisputeResolvedEvent {
  eventId: string;
  disputeId: string;
  providerRef: string;
  outcome: 'SUPPORTED' | 'NOT_SUPPORTED' | 'TIMEOUT';
}

export type DisputeOutcome = DisputeResolvedEvent['outcome'];
