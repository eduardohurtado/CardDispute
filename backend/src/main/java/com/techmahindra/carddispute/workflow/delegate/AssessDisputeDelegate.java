package com.techmahindra.carddispute.workflow.delegate;

import java.util.UUID;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;
import com.techmahindra.carddispute.transaction.service.AssessmentOutcome;

@Component("assessDisputeDelegate")
public class AssessDisputeDelegate implements JavaDelegate {

    private final DisputeLifecycleService lifecycleService;

    public AssessDisputeDelegate(DisputeLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    @Override
    public void execute(DelegateExecution execution) {

        UUID disputeId = UUID.fromString(execution.getBusinessKey());

        String correlationId = (String) execution.getVariable("correlationId");

        AssessmentOutcome outcome = lifecycleService.assess(disputeId, correlationId);

        if (outcome == null) {
            throw new IllegalStateException("Assessment outcome is null for dispute " + disputeId);
        }

        execution.setVariable("assessmentOutcome", outcome.name());
    }
}
