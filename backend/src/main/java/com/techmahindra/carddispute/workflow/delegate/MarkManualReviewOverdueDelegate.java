
package com.techmahindra.carddispute.workflow.delegate;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

@Component("markManualReviewOverdueDelegate")
public class MarkManualReviewOverdueDelegate implements JavaDelegate {

    @Override
    public void execute(DelegateExecution execution) {
        execution.setVariable("manualReviewOverdue", true);
    }
}
