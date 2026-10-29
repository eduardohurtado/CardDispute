package com.techmahindra.carddispute.dispute.service;

import java.util.UUID;

import com.techmahindra.carddispute.dispute.entity.DecisionType;

public interface ManualReviewDecisionService {

    void validateManualDecision(
            UUID disputeId, DecisionType decision, String comment, String analystUsername);

    void resolveManually(
            UUID disputeId,
            DecisionType decision,
            String comment,
            String analystUsername,
            String correlationId);
}
