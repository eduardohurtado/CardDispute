package com.techmahindra.carddispute.workflow.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Date;
import java.util.List;
import java.util.UUID;

import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.camunda.bpm.engine.runtime.ProcessInstanceQuery;
import org.camunda.bpm.engine.task.Task;
import org.camunda.bpm.engine.task.TaskQuery;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.workflow.dto.ReviewTaskResponse;
import com.techmahindra.carddispute.workflow.service.impl.ReviewTaskQueryServiceImpl;

@ExtendWith(MockitoExtension.class)
class ReviewTaskQueryServiceImplTest {

    private static final String PROCESS_ID = "process-001";
    private static final String TASK_ID = "task-001";

    private static final UUID DISPUTE_ID = UUID.fromString("4d1b89ce-1b1a-401d-9dcd-777ab3fbdac4");

    @Mock private TaskService taskService;

    @Mock private RuntimeService runtimeService;

    @Mock private TaskQuery taskQuery;

    @Mock private ProcessInstanceQuery processInstanceQuery;

    @Mock private Task task;

    @Mock private ProcessInstance processInstance;

    @InjectMocks private ReviewTaskQueryServiceImpl service;

    @Test
    void shouldFindPendingManualReviewTasks() {

        mockBaseQuery();

        when(taskQuery.count()).thenReturn(1L);

        when(taskQuery.orderByTaskCreateTime()).thenReturn(taskQuery);

        when(taskQuery.desc()).thenReturn(taskQuery);

        when(taskQuery.listPage(0, 20)).thenReturn(List.of(task));

        mockTaskMapping(true);

        PageResponse<ReviewTaskResponse> result = service.findPendingTasks(0, 20);

        assertEquals(1L, result.totalElements());
        assertEquals(1, result.totalPages());
        assertEquals(0, result.page());
        assertEquals(20, result.size());
        assertEquals(1, result.content().size());

        ReviewTaskResponse response = result.content().get(0);

        assertEquals(TASK_ID, response.taskId());
        assertEquals(DISPUTE_ID, response.disputeId());
        assertEquals(PROCESS_ID, response.processInstanceId());

        assertEquals("Task_ManualReview", response.taskDefinitionKey());

        assertTrue(response.overdue());
    }

    @Test
    void shouldFindPendingTaskById() {

        mockBaseQuery();

        when(taskQuery.taskId(TASK_ID)).thenReturn(taskQuery);

        when(taskQuery.singleResult()).thenReturn(task);

        mockTaskMapping(false);

        ReviewTaskResponse response = service.findPendingTaskById(TASK_ID).orElseThrow();

        assertEquals(TASK_ID, response.taskId());
        assertEquals(DISPUTE_ID, response.disputeId());
        assertEquals(PROCESS_ID, response.processInstanceId());
        assertFalse(response.overdue());
    }

    @Test
    void shouldReturnEmptyWhenTaskDoesNotExist() {

        mockBaseQuery();

        when(taskQuery.taskId("unknown-task")).thenReturn(taskQuery);

        when(taskQuery.singleResult()).thenReturn(null);

        assertTrue(service.findPendingTaskById("unknown-task").isEmpty());

        verifyNoInteractions(runtimeService);
    }

    @Test
    void shouldReturnEmptyPageWhenNoTasksExist() {

        mockBaseQuery();

        when(taskQuery.count()).thenReturn(0L);

        when(taskQuery.orderByTaskCreateTime()).thenReturn(taskQuery);

        when(taskQuery.desc()).thenReturn(taskQuery);

        when(taskQuery.listPage(0, 20)).thenReturn(List.of());

        PageResponse<ReviewTaskResponse> result = service.findPendingTasks(0, 20);

        assertTrue(result.content().isEmpty());
        assertEquals(0L, result.totalElements());
        assertEquals(0, result.totalPages());

        verifyNoInteractions(runtimeService);
    }

    @Test
    void shouldRejectInvalidPagination() {

        assertThrows(IllegalArgumentException.class, () -> service.findPendingTasks(-1, 20));

        assertThrows(IllegalArgumentException.class, () -> service.findPendingTasks(0, 0));

        assertThrows(IllegalArgumentException.class, () -> service.findPendingTasks(0, 101));

        assertThrows(
                IllegalArgumentException.class,
                () -> service.findPendingTasks(Integer.MAX_VALUE, 20));

        verifyNoInteractions(taskService);
        verifyNoInteractions(runtimeService);
    }

    @Test
    void shouldRejectBlankTaskId() {

        assertThrows(IllegalArgumentException.class, () -> service.findPendingTaskById(" "));

        assertThrows(IllegalArgumentException.class, () -> service.findPendingTaskById(null));

        verifyNoInteractions(taskService);
    }

    @Test
    void shouldRejectMissingProcessInstance() {

        mockBaseQuery();

        when(taskQuery.taskId(TASK_ID)).thenReturn(taskQuery);

        when(taskQuery.singleResult()).thenReturn(task);

        when(task.getProcessInstanceId()).thenReturn(PROCESS_ID);

        when(runtimeService.createProcessInstanceQuery()).thenReturn(processInstanceQuery);

        when(processInstanceQuery.processInstanceId(PROCESS_ID)).thenReturn(processInstanceQuery);

        when(processInstanceQuery.singleResult()).thenReturn(null);

        assertThrows(IllegalStateException.class, () -> service.findPendingTaskById(TASK_ID));
    }

    private void mockBaseQuery() {

        when(taskService.createTaskQuery()).thenReturn(taskQuery);

        when(taskQuery.processDefinitionKey("card-dispute-process")).thenReturn(taskQuery);

        when(taskQuery.taskDefinitionKey("Task_ManualReview")).thenReturn(taskQuery);

        when(taskQuery.active()).thenReturn(taskQuery);
    }

    private void mockTaskMapping(boolean overdue) {

        when(task.getId()).thenReturn(TASK_ID);

        when(task.getProcessInstanceId()).thenReturn(PROCESS_ID);

        when(task.getTaskDefinitionKey()).thenReturn("Task_ManualReview");

        when(task.getName()).thenReturn("Review disputed transaction");

        when(task.getCreateTime()).thenReturn(new Date());

        when(runtimeService.createProcessInstanceQuery()).thenReturn(processInstanceQuery);

        when(processInstanceQuery.processInstanceId(PROCESS_ID)).thenReturn(processInstanceQuery);

        when(processInstanceQuery.singleResult()).thenReturn(processInstance);

        when(processInstance.getBusinessKey()).thenReturn(DISPUTE_ID.toString());

        if (overdue) {
            when(runtimeService.getVariable(PROCESS_ID, "manualReviewOverdue")).thenReturn(true);
        }
    }
}
