package com.techmahindra.carddispute.dispute.dto;

import com.techmahindra.carddispute.dispute.entity.ReasonCode;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Submission payload. The customer always selects both charges: the disputed transaction and the
 * suspected duplicate. The customer id is never taken from the body: it comes from the principal.
 */
public record CreateDisputeRequest(
        @NotNull UUID transactionId,
        @NotNull UUID candidateTransactionId,
        @NotNull ReasonCode reasonCode,
        @Size(max = 500) String description
) {
}
