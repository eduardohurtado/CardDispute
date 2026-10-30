package com.techmahindra.carddispute.dispute.service.impl;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;

class ManualReviewDecisionServiceImplTest {

    private final DisputeLifecycleService lifecycleService = mock(DisputeLifecycleService.class);
    private final ManualReviewDecisionServiceImpl service =
            new ManualReviewDecisionServiceImpl(lifecycleService);

    @Test
    void validationDelegatesToLifecycle() {
        UUID disputeId = UUID.randomUUID();

        service.validateManualDecision(
                disputeId, DecisionType.NOT_SUPPORTED, "Different purchases", "analyst001");

        verify(lifecycleService)
                .validateAnalystDecision(
                        disputeId, DecisionType.NOT_SUPPORTED, "Different purchases", "analyst001");
    }

    @Test
    void resolutionDelegatesToLifecycle() {
        UUID disputeId = UUID.randomUUID();

        service.resolveManually(
                disputeId,
                DecisionType.DUPLICATE_SUPPORTED,
                "Same receipt",
                "analyst001",
                "corr-1");

        verify(lifecycleService)
                .resolveByAnalyst(
                        disputeId,
                        DecisionType.DUPLICATE_SUPPORTED,
                        "Same receipt",
                        "analyst001",
                        "corr-1");
    }
}
