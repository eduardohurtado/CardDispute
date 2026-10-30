package com.techmahindra.carddispute.dispute.dto;

import java.time.Instant;
import java.util.UUID;

import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.entity.ReasonCode;
import com.techmahindra.carddispute.transaction.dto.TransactionResponse;
import com.techmahindra.carddispute.transaction.service.AssessmentOutcome;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
        name = "DisputeResponse",
        description = "Full dispute details, assessment, and business decision.")
public record DisputeResponse(
        @Schema(description = "Unique dispute identifier.") UUID disputeId,
        @Schema(
                        description = "Current business status of the dispute.",
                        example = "RESOLVED_DUPLICATE_SUPPORTED")
                DisputeStatus status,
        @Schema(description = "Reason reported by the customer.", example = "POSSIBLE_DUPLICATE")
                ReasonCode reasonCode,
        @Schema(description = "Customer's dispute description.", nullable = true)
                String description,
        @Schema(
                        description =
                                """
                        Automatic assessment result.
                        Can be null before the assessment is completed.
                        MANUAL_REVIEW does not mean a final decision.
                        """,
                        example = "SUPPORTED",
                        nullable = true)
                AssessmentOutcome assessmentOutcome,
        @Schema(description = "Original disputed transaction.") TransactionResponse transaction,
        @Schema(description = "Transaction suspected to be a duplicate.")
                TransactionResponse candidateTransaction,
        @Schema(
                        description =
                                """
                        Final decision, if available.
                        Null while the dispute has not been resolved.
                        """,
                        nullable = true)
                DecisionResponse decision,
        @Schema(
                        description = "Dispute creation timestamp in UTC.",
                        type = "string",
                        format = "date-time")
                Instant createdAt,
        @Schema(
                        description = "Last business update timestamp in UTC.",
                        type = "string",
                        format = "date-time")
                Instant updatedAt,
        @Schema(
                        description = "Final resolution timestamp in UTC, if resolved.",
                        type = "string",
                        format = "date-time",
                        nullable = true)
                Instant resolvedAt) {}
