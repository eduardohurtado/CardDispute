
package com.techmahindra.carddispute.workflow.delegate;

import java.util.UUID;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.techmahindra.carddispute.dispute.service.DisputeService;

@Component("resolveDisputeDelegate")
public class ResolveDisputeDelegate implements JavaDelegate {

    private final DisputeService disputeService;

    public ResolveDisputeDelegate(DisputeService disputeService) {
        this.disputeService = disputeService;
    }

    @Override
    public void execute(DelegateExecution execution) {

        UUID disputeId = UUID.fromString(execution.getBusinessKey());

        String outcome = (String) execution.getVariable(
                "assessmentOutcome");

        String rationale = (String) execution.getVariable(
                "assessmentRationale");

        if (!"SUPPORTED".equals(outcome)
                && !"NOT_SUPPORTED".equals(outcome)) {
            throw new IllegalStateException(
                    "Invalid automatic resolution outcome: " + outcome);
        }

        if (rationale == null || rationale.isBlank()) {
            throw new IllegalStateException(
                    "Assessment rationale is required");
        }

        disputeService.resolveAutomatically(
                disputeId,
                outcome,
                rationale
        );
    }
}
