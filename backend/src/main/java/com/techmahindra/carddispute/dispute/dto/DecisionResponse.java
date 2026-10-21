package com.techmahindra.carddispute.dispute.dto;

import com.techmahindra.carddispute.dispute.entity.DecisionSource;
import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.entity.DisputeDecision;

import java.time.Instant;

public record DecisionResponse(
        DecisionType decisionType,
        DecisionSource decisionSource,
        String rationale,
        String decidedBy,
        Instant decidedAt
) {

    public static DecisionResponse from(DisputeDecision decision) {
        return new DecisionResponse(decision.getDecisionType(), decision.getDecisionSource(),
                decision.getRationale(), decision.getDecidedBy(), decision.getDecidedAt());
    }
}
