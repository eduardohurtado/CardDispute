
package com.techmahindra.carddispute.workflow.service;

import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.common.exception.ResourceNotFoundException;
import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.service.ManualReviewDecisionService;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.security.Role;
import com.techmahindra.carddispute.workflow.dto.CompleteManualReviewRequest;
import com.techmahindra.carddispute.workflow.dto.ManualReviewCompletionResponse;
import com.techmahindra.carddispute.workflow.service.impl.ReviewTaskCompletionServiceImpl;

import org.camunda.bpm.engine.HistoryService;
import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.history.HistoricTaskInstanceQuery;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.camunda.bpm.engine.runtime.ProcessInstanceQuery;
import org.camunda.bpm.engine.task.Task;
import org.camunda.bpm.engine.task.TaskQuery;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.access.AccessDeniedException;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewTaskCompletionServiceImplTest {

    private static final String TASK_ID = "task-001";
    private static final String PROCESS_ID = "process-001";

    private static final UUID DISPUTE_ID =
            UUID.fromString(
                    "4d1b89ce-1b1a-401d-9dcd-777ab3fbdac4"
            );

    @Mock
    private TaskService taskService;

    @Mock
    private RuntimeService runtimeService;

    @Mock
    private HistoryService historyService;

    @Mock
    private HistoricTaskInstanceQuery historicTaskQuery;

    @Mock
    private ManualReviewDecisionService decisionService;

    @Mock
    private TaskQuery taskQuery;

    @Mock
    private Task task;

    @Mock
    private ProcessInstanceQuery processInstanceQuery;

    @Mock
    private ProcessInstance processInstance;

    @InjectMocks
    private ReviewTaskCompletionServiceImpl service;

    private final AuthenticatedUser analyst =
            new AuthenticatedUser(
                    "analyst001",
                    "unused",
                    Role.DISPUTE_ANALYST,
                    null
            );

    private CompleteManualReviewRequest request(UUID disputeId) {
        return new CompleteManualReviewRequest(
                disputeId,
                DecisionType.DUPLICATE_SUPPORTED,
                "Duplicate transaction confirmed"
        );
    }

    @Test
    void shouldCompleteValidManualReviewTask() {

        mockTaskAndProcess();

        ManualReviewCompletionResponse response = service.complete(
                TASK_ID,
                request(DISPUTE_ID),
                analyst,
                "correlation-001"
        );

        assertEquals("ACCEPTED", response.status());
        assertEquals(TASK_ID, response.taskId());
        assertEquals(DISPUTE_ID, response.disputeId());
        assertEquals(PROCESS_ID, response.processInstanceId());

        verify(decisionService).validateManualDecision(
                eq(DISPUTE_ID),
                eq(DecisionType.DUPLICATE_SUPPORTED),
                eq("Duplicate transaction confirmed"),
                eq("analyst001")
        );

        verify(taskService).complete(
                eq(TASK_ID),
                argThat((Map<String, Object> variables) ->
                        "DUPLICATE_SUPPORTED".equals(
                                variables.get("analystDecision"))
                        && "analyst001".equals(
                                variables.get("analystUsername"))
                        && "correlation-001".equals(
                                variables.get("manualReviewCorrelationId"))
                )
        );
    }

    @Test
    void shouldRejectDisputeMismatch() {

        mockTaskAndProcess();

        UUID otherDisputeId = UUID.randomUUID();

        assertThrows(
                ConflictException.class,
                () -> service.complete(
                        TASK_ID,
                        request(otherDisputeId),
                        analyst,
                        "correlation-001"
                )
        );

        verifyNoInteractions(decisionService);
        verify(taskService, never())
                .complete(anyString(), anyMap());
    }

    @Test
    void shouldRejectCustomer() {

        AuthenticatedUser customer = new AuthenticatedUser(
                "customer001",
                "unused",
                Role.CUSTOMER,
                UUID.randomUUID()
        );

        assertThrows(
                AccessDeniedException.class,
                () -> service.complete(
                        TASK_ID,
                        request(DISPUTE_ID),
                        customer,
                        "correlation-001"
                )
        );

        verifyNoInteractions(
                taskService,
                runtimeService,
                decisionService
        );
    }

    @Test
    void shouldNotCompleteWhenBusinessValidationFails() {

        mockTaskAndProcess();

        doThrow(new ConflictException(
                "INVALID_MANUAL_DECISION",
                "Dispute cannot be resolved manually"
        )).when(decisionService).validateManualDecision(
                eq(DISPUTE_ID),
                any(),
                anyString(),
                eq("analyst001")
        );

        assertThrows(
                ConflictException.class,
                () -> service.complete(
                        TASK_ID,
                        request(DISPUTE_ID),
                        analyst,
                        "correlation-001"
                )
        );

        verify(taskService, never())
                .complete(anyString(), anyMap());
    }

    @Test
    void shouldRejectAlreadyCompletedTaskWithConflict() {

        mockNoActiveTask();
        mockHistoricCompletedTasks(1);

        ConflictException error = assertThrows(
                ConflictException.class,
                () -> service.complete(TASK_ID, request(DISPUTE_ID), analyst, "correlation-001")
        );

        assertEquals("REVIEW_TASK_ALREADY_COMPLETED", error.getErrorCode());
        verifyNoInteractions(decisionService);
        verify(taskService, never()).complete(anyString(), anyMap());
    }

    @Test
    void shouldRejectUnknownTaskAsNotFound() {

        mockNoActiveTask();
        mockHistoricCompletedTasks(0);

        ResourceNotFoundException error = assertThrows(
                ResourceNotFoundException.class,
                () -> service.complete(TASK_ID, request(DISPUTE_ID), analyst, "correlation-001")
        );

        assertEquals("REVIEW_TASK_NOT_FOUND", error.getErrorCode());
        verifyNoInteractions(decisionService);
    }

    private void mockNoActiveTask() {

        when(taskService.createTaskQuery()).thenReturn(taskQuery);
        when(taskQuery.taskId(TASK_ID)).thenReturn(taskQuery);
        when(taskQuery.processDefinitionKey("card-dispute-process")).thenReturn(taskQuery);
        when(taskQuery.taskDefinitionKey("Task_ManualReview")).thenReturn(taskQuery);
        when(taskQuery.active()).thenReturn(taskQuery);
        when(taskQuery.singleResult()).thenReturn(null);
    }

    private void mockHistoricCompletedTasks(long count) {

        when(historyService.createHistoricTaskInstanceQuery()).thenReturn(historicTaskQuery);
        when(historicTaskQuery.taskId(TASK_ID)).thenReturn(historicTaskQuery);
        when(historicTaskQuery.processDefinitionKey("card-dispute-process")).thenReturn(historicTaskQuery);
        when(historicTaskQuery.taskDefinitionKey("Task_ManualReview")).thenReturn(historicTaskQuery);
        when(historicTaskQuery.finished()).thenReturn(historicTaskQuery);
        when(historicTaskQuery.count()).thenReturn(count);
    }

    private void mockTaskAndProcess() {

        when(taskService.createTaskQuery()).thenReturn(taskQuery);

        when(taskQuery.taskId(TASK_ID)).thenReturn(taskQuery);

        when(taskQuery.processDefinitionKey("card-dispute-process"))
                .thenReturn(taskQuery);

        when(taskQuery.taskDefinitionKey("Task_ManualReview"))
                .thenReturn(taskQuery);

        when(taskQuery.active()).thenReturn(taskQuery);

        when(taskQuery.singleResult()).thenReturn(task);

        when(task.getProcessInstanceId())
                .thenReturn(PROCESS_ID);

        when(runtimeService.createProcessInstanceQuery())
                .thenReturn(processInstanceQuery);

        when(processInstanceQuery.processInstanceId(PROCESS_ID))
                .thenReturn(processInstanceQuery);

        when(processInstanceQuery.singleResult())
                .thenReturn(processInstance);

        when(processInstance.getBusinessKey())
                .thenReturn(DISPUTE_ID.toString());
    }
}
