package com.techmahindra.carddispute.dispute.dto;

import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.entity.ReasonCode;
import com.techmahindra.carddispute.transaction.dto.TransactionResponse;
import com.techmahindra.carddispute.transaction.service.AssessmentOutcome;

import java.time.Instant;
import java.util.UUID;

/** Full case view: status, both synthetic transactions and the final decision (null while open). */
public record DisputeResponse(
        UUID disputeId,
        DisputeStatus status,
        ReasonCode reasonCode,
        String description,
        AssessmentOutcome assessmentOutcome,
        TransactionResponse transaction,
        TransactionResponse candidateTransaction,
        DecisionResponse decision,
        Instant createdAt,
        Instant updatedAt,
        Instant resolvedAt
) {
}
