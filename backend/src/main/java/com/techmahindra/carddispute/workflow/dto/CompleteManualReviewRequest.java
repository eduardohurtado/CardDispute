
package com.techmahindra.carddispute.workflow.dto;

import com.techmahindra.carddispute.dispute.entity.DecisionType;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@Schema(description = "Analyst decision to complete a manual review task.")
public record CompleteManualReviewRequest(

        @NotNull
        @Schema(
                description = "Dispute associated with the Camunda task.",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        UUID disputeId,

        @NotNull
        @Schema(
                description = "Final banking decision.",
                example = "DUPLICATE_SUPPORTED",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        DecisionType decision,

        @NotBlank
        @Size(max = 1000)
        @Schema(
                description = "Analyst justification for the decision.",
                example = "Duplicate payment confirmed by transaction review.",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        String comment

) {
}
