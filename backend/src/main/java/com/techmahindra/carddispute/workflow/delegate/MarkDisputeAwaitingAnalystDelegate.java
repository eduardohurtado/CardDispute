package com.techmahindra.carddispute.workflow.delegate;

import java.util.UUID;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;

/** Moves a MANUAL_REVIEW dispute to AWAITING_ANALYST before the analyst user task is created. */
@Component("markDisputeAwaitingAnalystDelegate")
public class MarkDisputeAwaitingAnalystDelegate implements JavaDelegate {

    private final DisputeLifecycleService lifecycleService;

    public MarkDisputeAwaitingAnalystDelegate(DisputeLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    @Override
    public void execute(DelegateExecution execution) {

        UUID disputeId = UUID.fromString(execution.getBusinessKey());

        String correlationId = (String) execution.getVariable("correlationId");

        lifecycleService.markAwaitingAnalyst(disputeId, correlationId);
    }
}
