package com.techmahindra.carddispute.workflow.delegate;

import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;
import com.techmahindra.carddispute.dispute.service.ManualReviewDecisionService;

import org.camunda.bpm.engine.delegate.DelegateExecution;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ManualReviewDelegatesTest {

    private final UUID disputeId = UUID.randomUUID();

    private final DisputeLifecycleService lifecycleService =
            mock(DisputeLifecycleService.class);

    private final DelegateExecution execution =
            mock(DelegateExecution.class);

    @BeforeEach
    void setUp() {

        when(execution.getBusinessKey())
                .thenReturn(disputeId.toString());

        when(execution.getVariable("correlationId"))
                .thenReturn("corr-1");
    }

    @Test
    void resolveManualReviewDelegatesAnalystDecision() {

        ManualReviewDecisionService decisionService =
                mock(ManualReviewDecisionService.class);

        when(execution.getVariable("analystDecision"))
                .thenReturn("DUPLICATE_SUPPORTED");

        when(execution.getVariable("analystUsername"))
                .thenReturn("analyst001");

        when(execution.getVariable("analystComment"))
                .thenReturn("Duplicate confirmed");

        when(execution.getVariable("manualReviewCorrelationId"))
                .thenReturn("corr-manual");

        new ResolveManualReviewDelegate(decisionService)
                .execute(execution);

        verify(decisionService).resolveManually(
                disputeId,
                DecisionType.DUPLICATE_SUPPORTED,
                "Duplicate confirmed",
                "analyst001",
                "corr-manual"
        );
    }

    @Test
    void resolveManualReviewRejectsMissingDecision() {

        ManualReviewDecisionService decisionService =
                mock(ManualReviewDecisionService.class);

        assertThrows(
                IllegalStateException.class,
                () -> new ResolveManualReviewDelegate(
                        decisionService
                ).execute(execution)
        );

        verifyNoInteractions(decisionService);
    }

    @Test
    void markAwaitingAnalystDelegatesToLifecycle() {

        new MarkDisputeAwaitingAnalystDelegate(lifecycleService)
                .execute(execution);

        verify(lifecycleService).markAwaitingAnalyst(
                disputeId,
                "corr-1"
        );
    }

    @Test
    void overdueFlagsBusinessStateAndKeepsQueueVariable() {

        new MarkManualReviewOverdueDelegate(lifecycleService)
                .execute(execution);

        var order = inOrder(lifecycleService, execution);

        order.verify(lifecycleService)
                .markReviewTimedOut(disputeId, "corr-1");

        order.verify(execution)
                .setVariable("manualReviewOverdue", true);
    }
}
