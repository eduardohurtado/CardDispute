package com.techmahindra.carddispute.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record DisputeResolvedEvent(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        UUID disputeId,
        UUID customerId,
        String outcome,
        String correlationId) {}
