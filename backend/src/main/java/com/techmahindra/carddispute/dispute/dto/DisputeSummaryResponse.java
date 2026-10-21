package com.techmahindra.carddispute.dispute.dto;

import com.techmahindra.carddispute.dispute.entity.DisputeStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Row of the "My Disputes" list. */
public record DisputeSummaryResponse(
        UUID disputeId,
        UUID transactionId,
        String merchantName,
        BigDecimal amount,
        String currency,
        DisputeStatus status,
        Instant createdAt,
        Instant resolvedAt
) {
}
