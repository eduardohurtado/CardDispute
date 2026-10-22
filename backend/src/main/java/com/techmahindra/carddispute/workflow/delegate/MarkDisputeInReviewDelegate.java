
package com.techmahindra.carddispute.workflow.delegate;

import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("markDisputeInReviewDelegate")
public class MarkDisputeInReviewDelegate implements JavaDelegate {

    private final DisputeLifecycleService lifecycleService;

    public MarkDisputeInReviewDelegate(
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

        lifecycleService.markInReview(
                disputeId,
                correlationId
        );
    }
}
