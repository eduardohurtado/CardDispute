
package com.techmahindra.carddispute.workflow.delegate;

import java.util.UUID;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import com.techmahindra.carddispute.transaction.dto.AssessmentResult;
import com.techmahindra.carddispute.transaction.service.TransactionAssessmentService;

@Component("assessDisputeDelegate")
public class AssessDisputeDelegate implements JavaDelegate {

    private final TransactionAssessmentService assessmentService;

    public AssessDisputeDelegate(
            TransactionAssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @Override
    public void execute(DelegateExecution execution) {

        UUID disputeId = UUID.fromString(execution.getBusinessKey());

        AssessmentResult result =
                assessmentService.assessDispute(disputeId);

        if (result == null
                || result.getOutcome() == null
                || result.getRationale() == null
                || result.getRationale().isBlank()) {
            throw new IllegalStateException(
                    "Incomplete assessment for dispute " + disputeId);
        }

        String outcome = result.getOutcome();

        if (!"SUPPORTED".equals(outcome)
                && !"NOT_SUPPORTED".equals(outcome)
                && !"MANUAL_REVIEW".equals(outcome)) {
            throw new IllegalStateException(
                    "Unsupported assessment outcome: " + outcome);
        }

        execution.setVariable("assessmentOutcome", outcome);
        execution.setVariable("assessmentRationale", result.getRationale());
    }
}
