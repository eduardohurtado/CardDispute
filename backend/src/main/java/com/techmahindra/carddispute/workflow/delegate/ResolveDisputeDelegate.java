
package com.techmahindra.carddispute.workflow.delegate;

import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("resolveDisputeDelegate")
public class ResolveDisputeDelegate implements JavaDelegate {

    private final DisputeLifecycleService lifecycleService;

    public ResolveDisputeDelegate(
            DisputeLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    @Override
    public void execute(DelegateExecution execution) {

        UUID disputeId = UUID.fromString(
                execution.getBusinessKey()
        );

        String correlationId = (String) execution.getVariable(
                "correlationId"
        );

        String outcome = (String) execution.getVariable(
                "assessmentOutcome"
        );

        if (!"SUPPORTED".equals(outcome)
                && !"NOT_SUPPORTED".equals(outcome)) {
            throw new IllegalStateException(
                    "Invalid automatic resolution outcome: " + outcome
            );
        }

        lifecycleService.resolveAutomatically(
                disputeId,
                correlationId
        );
    }
}
