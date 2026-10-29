package com.techmahindra.carddispute.dispute.dto;

import java.time.Instant;

import com.techmahindra.carddispute.dispute.entity.DecisionSource;
import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.entity.DisputeDecision;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "DecisionResponse", description = "Final business decision for a card dispute.")
public record DecisionResponse(
        @Schema(description = "Business decision outcome.", example = "DUPLICATE_SUPPORTED")
                DecisionType decisionType,
        @Schema(description = "Origin of the decision.", example = "AUTOMATED")
                DecisionSource decisionSource,
        @Schema(
                        description = "Explanation supporting the decision.",
                        example = "Automated assessment based on transaction matching.")
                String rationale,
        @Schema(
                        description = "Identifier of the actor responsible for the decision.",
                        example = "SYSTEM")
                String decidedBy,
        @Schema(
                        description = "Decision timestamp in UTC.",
                        type = "string",
                        format = "date-time",
                        example = "2026-10-22T12:35:00Z")
                Instant decidedAt) {

    public static DecisionResponse from(DisputeDecision decision) {

        return new DecisionResponse(
                decision.getDecisionType(),
                decision.getDecisionSource(),
                decision.getRationale(),
                decision.getDecidedBy(),
                decision.getDecidedAt());
    }
}
