package com.techmahindra.carddispute.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;

import org.camunda.bpm.model.bpmn.Bpmn;
import org.camunda.bpm.model.bpmn.BpmnModelInstance;
import org.camunda.bpm.model.bpmn.instance.BoundaryEvent;
import org.camunda.bpm.model.bpmn.instance.FlowNode;
import org.camunda.bpm.model.bpmn.instance.SequenceFlow;
import org.camunda.bpm.model.bpmn.instance.ServiceTask;
import org.camunda.bpm.model.bpmn.instance.UserTask;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** Structural checks of bpmn/card-dispute.bpmn; parses the model only (no engine, no database). */
class CardDisputeProcessModelTest {

    private static BpmnModelInstance model;

    @BeforeAll
    static void readModel() throws Exception {
        try (InputStream bpmn =
                CardDisputeProcessModelTest.class.getResourceAsStream("/bpmn/card-dispute.bpmn")) {
            model = Bpmn.readModelFromStream(bpmn);
        }
    }

    @Test
    void manualReviewMarksAwaitingAnalystBeforeTheUserTask() {
        SequenceFlow manualReview = model.getModelElementById("Flow_ManualReview");
        ServiceTask markAwaiting = model.getModelElementById("Task_MarkAwaitingAnalyst");

        assertThat(manualReview.getTarget().getId()).isEqualTo("Task_MarkAwaitingAnalyst");
        assertThat(markAwaiting.getCamundaDelegateExpression())
                .isEqualTo("${markDisputeAwaitingAnalystDelegate}");
        assertThat(singleTarget(markAwaiting)).isEqualTo("Task_ManualReview");
    }

    @Test
    void analystTaskIsForDisputeAnalysts() {
        UserTask review = model.getModelElementById("Task_ManualReview");

        assertThat(review.getCamundaCandidateGroups()).isEqualTo("DISPUTE_ANALYST");
        assertThat(singleTarget(review)).isEqualTo("Task_ResolveManualReview");
    }

    @Test
    void manualResolutionRunsInTheTaskCompletionCommand() {
        ServiceTask resolve = model.getModelElementById("Task_ResolveManualReview");

        // Synchronous, so a failed resolution rolls back the task completion and reaches the
        // analyst as an error
        assertThat(resolve.isCamundaAsyncBefore()).isTrue();
        assertThat(resolve.getCamundaDelegateExpression())
                .isEqualTo("${resolveManualReviewDelegate}");
    }

    @Test
    void reviewDeadlineFlagsTheDisputeWithoutCancellingTheTask() {
        BoundaryEvent deadline = model.getModelElementById("Boundary_ManualReviewDeadline");

        assertThat(deadline.getAttachedTo().getId()).isEqualTo("Task_ManualReview");
        assertThat(deadline.cancelActivity()).isFalse();
        assertThat(singleTarget(deadline)).isEqualTo("Task_MarkManualReviewOverdue");
        ServiceTask overdue = model.getModelElementById("Task_MarkManualReviewOverdue");
        assertThat(overdue.getCamundaDelegateExpression())
                .isEqualTo("${markManualReviewOverdueDelegate}");
    }

    private static String singleTarget(FlowNode node) {
        assertThat(node.getOutgoing()).hasSize(1);
        return node.getOutgoing().iterator().next().getTarget().getId();
    }
}
