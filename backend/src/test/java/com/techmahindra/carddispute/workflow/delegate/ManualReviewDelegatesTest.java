package com.techmahindra.carddispute.workflow.delegate;

import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ManualReviewDelegatesTest {

    private final UUID disputeId = UUID.randomUUID();
    private final DisputeLifecycleService lifecycleService = mock(DisputeLifecycleService.class);
    private final DelegateExecution execution = mock(DelegateExecution.class);

    @BeforeEach
    void setUp() {
        when(execution.getBusinessKey()).thenReturn(disputeId.toString());
        when(execution.getVariable("correlationId")).thenReturn("corr-1");
    }

    @Test
    void markAwaitingAnalystDelegatesToLifecycle() {
        new MarkDisputeAwaitingAnalystDelegate(lifecycleService).execute(execution);

        verify(lifecycleService).markAwaitingAnalyst(disputeId, "corr-1");
    }

    @Test
    void overdueFlagsBusinessStateAndKeepsQueueVariable() {
        new MarkManualReviewOverdueDelegate(lifecycleService).execute(execution);

        var order = inOrder(lifecycleService, execution);
        order.verify(lifecycleService).markReviewTimedOut(disputeId, "corr-1");
        order.verify(execution).setVariable("manualReviewOverdue", true);
    }
}
