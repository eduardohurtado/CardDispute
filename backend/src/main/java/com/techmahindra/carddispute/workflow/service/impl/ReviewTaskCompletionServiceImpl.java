
package com.techmahindra.carddispute.workflow.service.impl;

import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.common.exception.ResourceNotFoundException;
import com.techmahindra.carddispute.dispute.service.ManualReviewDecisionService;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.workflow.dto.CompleteManualReviewRequest;
import com.techmahindra.carddispute.workflow.dto.ManualReviewCompletionResponse;
import com.techmahindra.carddispute.workflow.service.ReviewTaskCompletionService;

import lombok.RequiredArgsConstructor;

import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.camunda.bpm.engine.task.Task;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewTaskCompletionServiceImpl
        implements ReviewTaskCompletionService {

    private static final String PROCESS_DEFINITION_KEY =
            "card-dispute-process";

    private static final String TASK_DEFINITION_KEY =
            "Task_ManualReview";

    private final TaskService taskService;
    private final RuntimeService runtimeService;
    private final ManualReviewDecisionService decisionService;

    @Override
    public ManualReviewCompletionResponse complete(
            String taskId,
            CompleteManualReviewRequest request,
            AuthenticatedUser analyst,
            String correlationId) {

        if (analyst == null || !analyst.isAnalyst()) {
            throw new AccessDeniedException(
                    "Dispute analyst role required"
            );
        }

        if (taskId == null || taskId.isBlank()) {
            throw new IllegalArgumentException(
                    "taskId must not be blank"
            );
        }

        Objects.requireNonNull(request, "request must not be null");

        Task task = taskService.createTaskQuery()
                .taskId(taskId)
                .processDefinitionKey(PROCESS_DEFINITION_KEY)
                .taskDefinitionKey(TASK_DEFINITION_KEY)
                .active()
                .singleResult();

        if (task == null) {
            throw new ResourceNotFoundException(
                    "REVIEW_TASK_NOT_FOUND",
                    "Pending review task not found"
            );
        }

        if (task.getAssignee() != null
                && !task.getAssignee().equals(analyst.username())) {
            throw new AccessDeniedException(
                    "Review task is assigned to another analyst"
            );
        }

        String processInstanceId = task.getProcessInstanceId();

        ProcessInstance instance = runtimeService
                .createProcessInstanceQuery()
                .processInstanceId(processInstanceId)
                .singleResult();

        if (instance == null) {
            throw new ConflictException(
                    "WORKFLOW_NOT_ACTIVE",
                    "The review process is no longer active"
            );
        }

        UUID disputeId = UUID.fromString(
                instance.getBusinessKey()
        );

        if (!disputeId.equals(request.disputeId())) {
            throw new ConflictException(
                    "REVIEW_TASK_DISPUTE_MISMATCH",
                    "Task does not belong to the supplied dispute"
            );
        }

        decisionService.validateManualDecision(
                disputeId,
                request.decision(),
                request.comment(),
                analyst.username()
        );

        Map<String, Object> variables = new HashMap<>();
        variables.put("analystDecision", request.decision().name());
        variables.put("analystUsername", analyst.username());
        variables.put("analystComment", request.comment());
        variables.put("manualReviewCorrelationId", correlationId);

        taskService.complete(taskId, variables);

        return new ManualReviewCompletionResponse(
                taskId,
                disputeId,
                processInstanceId,
                "ACCEPTED"
        );
    }
}
