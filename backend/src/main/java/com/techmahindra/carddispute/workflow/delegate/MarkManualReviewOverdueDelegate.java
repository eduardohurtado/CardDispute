
package com.techmahindra.carddispute.workflow.delegate;

import com.techmahindra.carddispute.dispute.service.DisputeLifecycleService;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Runs when the non-interrupting review deadline fires: flags the dispute as TIMEOUT_REVIEW_REQUIRED
 * (business state) and keeps the process variable used by the task queue. The analyst task stays open.
 */
@Component("markManualReviewOverdueDelegate")
public class MarkManualReviewOverdueDelegate implements JavaDelegate {

    private final DisputeLifecycleService lifecycleService;

    public MarkManualReviewOverdueDelegate(
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

        lifecycleService.markReviewTimedOut(
                disputeId,
                correlationId
        );

        execution.setVariable("manualReviewOverdue", true);
    }
}
