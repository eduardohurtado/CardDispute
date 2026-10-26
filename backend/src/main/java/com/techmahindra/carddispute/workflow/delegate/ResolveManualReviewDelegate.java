
package com.techmahindra.carddispute.workflow.delegate;

import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.service.ManualReviewDecisionService;

import lombok.RequiredArgsConstructor;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("resolveManualReviewDelegate")
@RequiredArgsConstructor
public class ResolveManualReviewDelegate implements JavaDelegate {

    private final ManualReviewDecisionService decisionService;

    @Override
    public void execute(DelegateExecution execution) {

        UUID disputeId = UUID.fromString(
                execution.getBusinessKey()
        );

        String decisionValue = requiredVariable(
                execution,
                "analystDecision"
        );

        String analystUsername = requiredVariable(
                execution,
                "analystUsername"
        );

        String comment = requiredVariable(
                execution,
                "analystComment"
        );

        String correlationId = requiredVariable(
                execution,
                "manualReviewCorrelationId"
        );

        DecisionType decision = DecisionType.valueOf(
                decisionValue
        );

        decisionService.resolveManually(
                disputeId,
                decision,
                comment,
                analystUsername,
                correlationId
        );
    }

    private static String requiredVariable(
            DelegateExecution execution,
            String name) {

        Object value = execution.getVariable(name);

        if (!(value instanceof String text)
                || text.isBlank()) {
            throw new IllegalStateException(
                    "Required workflow variable is missing: " + name
            );
        }

        return text;
    }
}
