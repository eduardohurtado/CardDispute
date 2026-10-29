package com.techmahindra.carddispute.dispute.service.impl;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;
import com.techmahindra.carddispute.dispute.service.ManualReviewDecisionService;

import lombok.RequiredArgsConstructor;

/**
 * Workflow-facing entry point for analyst decisions; the business rules live in
 * DisputeLifecycleService.
 */
@Service
@RequiredArgsConstructor
public class ManualReviewDecisionServiceImpl implements ManualReviewDecisionService {

    private final DisputeLifecycleService lifecycleService;

    @Override
    public void validateManualDecision(
            UUID disputeId, DecisionType decision, String comment, String analystUsername) {
        lifecycleService.validateAnalystDecision(disputeId, decision, comment, analystUsername);
    }

    @Override
    public void resolveManually(
            UUID disputeId,
            DecisionType decision,
            String comment,
            String analystUsername,
            String correlationId) {
        lifecycleService.resolveByAnalyst(
                disputeId, decision, comment, analystUsername, correlationId);
    }
}
