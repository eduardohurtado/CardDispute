package com.techmahindra.carddispute.dispute.dto;

import com.techmahindra.carddispute.dispute.entity.ReasonCode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@Schema(
        name = "CreateDisputeRequest",
        description = "Request to report a suspected duplicate card charge."
)
public record CreateDisputeRequest(

        @Schema(
                description = "Identifier of the transaction being disputed.",
                example = "aaaaaaaa-0000-0000-0000-000000000001",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        @NotNull
        UUID transactionId,

        @Schema(
                description = "Identifier of the suspected duplicate transaction.",
                example = "aaaaaaaa-0000-0000-0000-000000000002",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        @NotNull
        UUID candidateTransactionId,

        @Schema(
                description = "Business reason for the dispute.",
                example = "POSSIBLE_DUPLICATE",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        @NotNull
        ReasonCode reasonCode,

        @Schema(
                description = "Optional explanation provided by the customer.",
                example = "I was charged twice for the same purchase.",
                maxLength = 500,
                nullable = true
        )
        @Size(max = 500)
        String description
) {
}