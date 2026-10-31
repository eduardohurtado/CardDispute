export interface DisputeResolvedEvent {
  eventId: string;
  eventType: 'DISPUTE_RESOLVED';
  occurredAt: string;
  disputeId: string;
  customerId: string;
  outcome: 'SUPPORTED' | 'NOT_SUPPORTED';
  correlationId: string;
}

export type DisputeOutcome = DisputeResolvedEvent['outcome'];
