package com.techmahindra.carddispute.workflow.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.dispute.security.config.TestAuthenticationConfig;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.security.Role;
import com.techmahindra.carddispute.security.config.SecurityConfig;
import com.techmahindra.carddispute.security.service.DatabaseUserDetailsService;
import com.techmahindra.carddispute.workflow.controller.impl.ReviewTaskControllerImpl;
import com.techmahindra.carddispute.workflow.dto.ManualReviewCompletionResponse;
import com.techmahindra.carddispute.workflow.dto.ReviewTaskResponse;
import com.techmahindra.carddispute.workflow.service.ReviewTaskCompletionService;
import com.techmahindra.carddispute.workflow.service.ReviewTaskQueryService;

@WebMvcTest(ReviewTaskControllerImpl.class)
@Import({SecurityConfig.class, TestAuthenticationConfig.class})
class ReviewTaskControllerImplTest {

    private static final String BASE_URL = "/api/v1/workflow/tasks";

    private static final String TASK_ID = "task-001";

    private static final UUID DISPUTE_ID = UUID.fromString("4d1b89ce-1b1a-401d-9dcd-777ab3fbdac4");

    @Autowired private MockMvc mockMvc;

    @Autowired private PasswordEncoder passwordEncoder;

    @MockitoBean private ReviewTaskQueryService reviewTaskQueryService;

    @MockitoBean private ReviewTaskCompletionService reviewTaskCompletionService;

    @MockitoBean private DatabaseUserDetailsService databaseUserDetailsService;

    @BeforeEach
    void setUp() {

        when(databaseUserDetailsService.loadUserByUsername("analyst001"))
                .thenReturn(
                        new AuthenticatedUser(
                                "analyst001",
                                passwordEncoder.encode("demo"),
                                Role.DISPUTE_ANALYST,
                                null));

        when(databaseUserDetailsService.loadUserByUsername("customer001"))
                .thenReturn(
                        new AuthenticatedUser(
                                "customer001",
                                passwordEncoder.encode("demo"),
                                Role.CUSTOMER,
                                UUID.fromString("11111111-1111-1111-1111-000000000001")));
    }

    @Test
    void analystCanListPendingTasks() throws Exception {

        ReviewTaskResponse task = taskResponse();

        PageResponse<ReviewTaskResponse> page = new PageResponse<>(List.of(task), 0, 20, 1L, 1);

        when(reviewTaskQueryService.findPendingTasks(0, 20)).thenReturn(page);

        mockMvc.perform(get(BASE_URL).with(httpBasic("analyst001", "demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.content[0].taskId").value(TASK_ID))
                .andExpect(jsonPath("$.content[0].disputeId").value(DISPUTE_ID.toString()))
                .andExpect(jsonPath("$.content[0].overdue").value(true));

        verify(reviewTaskQueryService).findPendingTasks(0, 20);
    }

    @Test
    void analystCanGetPendingTaskById() throws Exception {

        when(reviewTaskQueryService.findPendingTaskById(TASK_ID))
                .thenReturn(Optional.of(taskResponse()));

        mockMvc.perform(get(BASE_URL + "/" + TASK_ID).with(httpBasic("analyst001", "demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId").value(TASK_ID))
                .andExpect(jsonPath("$.disputeId").value(DISPUTE_ID.toString()))
                .andExpect(jsonPath("$.taskDefinitionKey").value("Task_ManualReview"));

        verify(reviewTaskQueryService).findPendingTaskById(TASK_ID);
    }

    @Test
    void missingTaskReturnsNotFound() throws Exception {

        when(reviewTaskQueryService.findPendingTaskById("unknown")).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE_URL + "/unknown").with(httpBasic("analyst001", "demo")))
                .andExpect(status().isNotFound());

        verify(reviewTaskQueryService).findPendingTaskById("unknown");
    }

    @Test
    void invalidPaginationReturnsBadRequest() throws Exception {

        mockMvc.perform(
                        get(BASE_URL)
                                .with(httpBasic("analyst001", "demo"))
                                .param("page", "-1")
                                .param("size", "20"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(
                        get(BASE_URL)
                                .with(httpBasic("analyst001", "demo"))
                                .param("page", "0")
                                .param("size", "101"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(reviewTaskQueryService);
    }

    @Test
    void customerCannotAccessReviewTasks() throws Exception {

        mockMvc.perform(get(BASE_URL).with(httpBasic("customer001", "demo")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get(BASE_URL + "/" + TASK_ID).with(httpBasic("customer001", "demo")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(reviewTaskQueryService);
    }

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {

        mockMvc.perform(get(BASE_URL)).andExpect(status().isUnauthorized());

        mockMvc.perform(get(BASE_URL + "/" + TASK_ID)).andExpect(status().isUnauthorized());

        verifyNoInteractions(reviewTaskQueryService);
    }

    @Test
    void analystCanCompleteManualReviewTask() throws Exception {

        when(reviewTaskCompletionService.complete(eq(TASK_ID), any(), any(), anyString()))
                .thenReturn(
                        new ManualReviewCompletionResponse(
                                TASK_ID, DISPUTE_ID, "process-001", "ACCEPTED"));

        mockMvc.perform(
                        post(BASE_URL + "/" + TASK_ID + "/complete")
                                .with(httpBasic("analyst001", "demo"))
                                .contentType(APPLICATION_JSON)
                                .content(validCompletionJson()))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.taskId").value(TASK_ID))
                .andExpect(jsonPath("$.disputeId").value(DISPUTE_ID.toString()))
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        verify(reviewTaskCompletionService)
                .complete(
                        eq(TASK_ID),
                        argThat(
                                request ->
                                        DISPUTE_ID.equals(request.disputeId())
                                                && "DUPLICATE_SUPPORTED"
                                                        .equals(request.decision().name())
                                                && "Duplicate confirmed".equals(request.comment())),
                        argThat(user -> "analyst001".equals(user.username()) && user.isAnalyst()),
                        anyString());
    }

    @Test
    void invalidCompletionRequestReturnsBadRequest() throws Exception {

        String invalidJson =
                """
                {
                  "disputeId": "%s",
                  "decision": null,
                  "comment": ""
                }
                """
                        .formatted(DISPUTE_ID);

        mockMvc.perform(
                        post(BASE_URL + "/" + TASK_ID + "/complete")
                                .with(httpBasic("analyst001", "demo"))
                                .contentType(APPLICATION_JSON)
                                .content(invalidJson))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(reviewTaskCompletionService);
    }

    @Test
    void customerCannotCompleteManualReviewTask() throws Exception {

        mockMvc.perform(
                        post(BASE_URL + "/" + TASK_ID + "/complete")
                                .with(httpBasic("customer001", "demo"))
                                .contentType(APPLICATION_JSON)
                                .content(validCompletionJson()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(reviewTaskCompletionService);
    }

    @Test
    void unauthenticatedUserCannotCompleteManualReviewTask() throws Exception {

        mockMvc.perform(
                        post(BASE_URL + "/" + TASK_ID + "/complete")
                                .contentType(APPLICATION_JSON)
                                .content(validCompletionJson()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(reviewTaskCompletionService);
    }

    private String validCompletionJson() {

        return """
                {
                  "disputeId": "%s",
                  "decision": "DUPLICATE_SUPPORTED",
                  "comment": "Duplicate confirmed"
                }
                """
                .formatted(DISPUTE_ID);
    }

    private ReviewTaskResponse taskResponse() {

        return new ReviewTaskResponse(
                TASK_ID,
                DISPUTE_ID,
                "process-001",
                "Task_ManualReview",
                "Review disputed transaction",
                null,
                Instant.parse("2026-10-26T18:13:29Z"),
                true);
    }
}
