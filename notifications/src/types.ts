export interface DisputeResolvedEvent {
  event_id: string;
  dispute_id: string;
  correlation_id: string;
  provider_ref: string;
  outcome: 'SUPPORTED' | 'NOT_SUPPORTED' | 'TIMEOUT';
}
