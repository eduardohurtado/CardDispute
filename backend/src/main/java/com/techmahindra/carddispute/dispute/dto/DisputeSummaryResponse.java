package com.techmahindra.carddispute.dispute.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.techmahindra.carddispute.dispute.entity.DisputeStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
        name = "DisputeSummaryResponse",
        description = "Summary of a dispute shown in paginated customer lists.")
public record DisputeSummaryResponse(
        @Schema(description = "Unique dispute identifier.") UUID disputeId,
        @Schema(description = "Identifier of the disputed transaction.") UUID transactionId,
        @Schema(description = "Name of the merchant.") String merchantName,
        @Schema(description = "Amount of the disputed transaction.", example = "35000.00")
                BigDecimal amount,
        @Schema(description = "ISO 4217 currency code.", example = "COP") String currency,
        @Schema(description = "Current dispute status.", example = "IN_REVIEW")
                DisputeStatus status,
        @Schema(description = "Creation timestamp in UTC.", type = "string", format = "date-time")
                Instant createdAt,
        @Schema(
                        description = "Final resolution timestamp, if resolved.",
                        type = "string",
                        format = "date-time",
                        nullable = true)
                Instant resolvedAt) {}
