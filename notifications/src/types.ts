export interface DisputeResolvedEvent {
  eventId: string;
  disputeId: string;
  correlationId: string;

  occurredAt: string;
}
