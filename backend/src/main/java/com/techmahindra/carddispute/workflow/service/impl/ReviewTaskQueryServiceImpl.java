
package com.techmahindra.carddispute.workflow.service.impl;

import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.workflow.dto.ReviewTaskResponse;
import com.techmahindra.carddispute.workflow.service.ReviewTaskQueryService;

import lombok.RequiredArgsConstructor;

import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.camunda.bpm.engine.task.Task;
import org.camunda.bpm.engine.task.TaskQuery;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewTaskQueryServiceImpl
        implements ReviewTaskQueryService {

    private static final String PROCESS_DEFINITION_KEY =
            "card-dispute-process";

    private static final String TASK_DEFINITION_KEY =
            "Task_ManualReview";

    private static final String OVERDUE_VARIABLE =
            "manualReviewOverdue";

    private static final int MAX_PAGE_SIZE = 100;

    private final TaskService taskService;
    private final RuntimeService runtimeService;

    @Override
    public PageResponse<ReviewTaskResponse> findPendingTasks(
            int page,
            int size) {

        validatePagination(page, size);

        long totalElements = baseQuery().count();

        int offset = Math.toIntExact(
                Math.multiplyExact((long) page, size)
        );

        List<ReviewTaskResponse> tasks = baseQuery()
                .orderByTaskCreateTime()
                .desc()
                .listPage(offset, size)
                .stream()
                .map(this::toResponse)
                .toList();

        int totalPages = Math.toIntExact(
                totalElements / size
                        + (totalElements % size == 0 ? 0 : 1)
        );

        return new PageResponse<>(
                tasks,
                page,
                size,
                totalElements,
                totalPages
        );
    }

    @Override
    public Optional<ReviewTaskResponse> findPendingTaskById(
            String taskId) {

        if (taskId == null || taskId.isBlank()) {
            throw new IllegalArgumentException(
                    "taskId must not be blank"
            );
        }

        Task task = baseQuery()
                .taskId(taskId)
                .singleResult();

        return Optional.ofNullable(task)
                .map(this::toResponse);
    }

    private TaskQuery baseQuery() {

        return taskService
                .createTaskQuery()
                .processDefinitionKey(PROCESS_DEFINITION_KEY)
                .taskDefinitionKey(TASK_DEFINITION_KEY)
                .active();
    }

    private ReviewTaskResponse toResponse(Task task) {

        String processInstanceId =
                task.getProcessInstanceId();

        ProcessInstance processInstance = runtimeService
                .createProcessInstanceQuery()
                .processInstanceId(processInstanceId)
                .singleResult();

        if (processInstance == null) {
            throw new IllegalStateException(
                    "No active process instance found for task: "
                            + task.getId()
            );
        }

        String businessKey = processInstance.getBusinessKey();

        if (businessKey == null || businessKey.isBlank()) {
            throw new IllegalStateException(
                    "Business key is missing for task: "
                            + task.getId()
            );
        }

        UUID disputeId = UUID.fromString(businessKey);

        Object overdueValue = runtimeService.getVariable(
                processInstanceId,
                OVERDUE_VARIABLE
        );

        boolean overdue = Boolean.TRUE.equals(overdueValue);

        return new ReviewTaskResponse(
                task.getId(),
                disputeId,
                processInstanceId,
                task.getTaskDefinitionKey(),
                task.getName(),
                task.getAssignee(),
                task.getCreateTime() == null
                        ? null
                        : task.getCreateTime().toInstant(),
                overdue
        );
    }

    private void validatePagination(int page, int size) {

        if (page < 0) {
            throw new IllegalArgumentException(
                    "page must be greater than or equal to zero"
            );
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException(
                    "size must be between 1 and "
                            + MAX_PAGE_SIZE
            );
        }

        if ((long) page * size > Integer.MAX_VALUE) {
            throw new IllegalArgumentException(
                    "Requested page offset exceeds supported range"
            );
        }
    }
}
