
package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.dispute.entity.DecisionType;

import java.util.UUID;

public interface ManualReviewDecisionService {

    void validateManualDecision(
            UUID disputeId,
            DecisionType decision,
            String comment,
            String analystUsername
    );

    void resolveManually(
            UUID disputeId,
            DecisionType decision,
            String comment,
            String analystUsername,
            String correlationId
    );
}
