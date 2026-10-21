
package com.techmahindra.carddispute.workflow.delegate;

import java.util.UUID;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.techmahindra.carddispute.dispute.service.DisputeService;

@Component("markDisputeInReviewDelegate")
public class MarkDisputeInReviewDelegate implements JavaDelegate {

    private final DisputeService disputeService;

    public MarkDisputeInReviewDelegate(DisputeService disputeService) {
        this.disputeService = disputeService;
    }

    @Override
    public void execute(DelegateExecution execution) {

        UUID disputeId = UUID.fromString(execution.getBusinessKey());

        disputeService.markInReview(disputeId);
    }
}
