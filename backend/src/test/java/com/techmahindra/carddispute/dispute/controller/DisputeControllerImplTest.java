package com.techmahindra.carddispute.dispute.controller;

import com.techmahindra.carddispute.common.exception.BusinessRuleViolationException;
import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.security.config.SecurityConfig;
import com.techmahindra.carddispute.dispute.controller.impl.DisputeControllerImpl;
import com.techmahindra.carddispute.dispute.dto.DisputeResponse;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.entity.ReasonCode;
import com.techmahindra.carddispute.dispute.service.DisputeService;
import com.techmahindra.carddispute.transaction.dto.TransactionResponse;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;
import com.techmahindra.carddispute.workflow.service.WorkflowService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.ArgumentMatchers.eq;

@WebMvcTest(DisputeControllerImpl.class)
@Import(SecurityConfig.class)
class DisputeControllerImplTest {

    private static final String TRANSACTION_ID = "aaaaaaaa-0000-0000-0000-000000000001";
    private static final String CANDIDATE_ID = "aaaaaaaa-0000-0000-0000-000000000002";
    private static final String BODY = """
            {"transactionId":"%s","candidateTransactionId":"%s","reasonCode":"POSSIBLE_DUPLICATE",
             "description":"Charged twice"}
            """.formatted(TRANSACTION_ID, CANDIDATE_ID);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DisputeService disputeService;

    @MockitoBean
    private WorkflowService workflowService;

    @Test
    void answersCorsPreflightForTheDemoOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/disputes")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
    }

    @Test
    void rejectsCorsPreflightFromAnUnknownOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/disputes")
                        .header(HttpHeaders.ORIGIN, "https://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/disputes"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(header().doesNotExist("WWW-Authenticate"));
    }

    @Test
    void customerSubmitsDispute() throws Exception {
        UUID disputeId = UUID.randomUUID();
        String processInstanceId = "camunda-process-123";

        when(disputeService.submit(any(AuthenticatedUser.class), any(), anyString())).thenReturn(response(disputeId));
        when(workflowService.startDisputeProcess(eq(disputeId),anyString())).thenReturn(processInstanceId);
        when(disputeService.get(any(AuthenticatedUser.class),eq(disputeId))).thenReturn(response(disputeId));

        mockMvc.perform(post("/api/v1/disputes").with(httpBasic("customer01", "demo"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/v1/disputes/" + disputeId))
                .andExpect(header().exists("X-Correlation-Id"))
                .andExpect(jsonPath("$.disputeId").value(disputeId.toString()))
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.transaction.merchantName").value("CAFE AROMA BOGOTA 001"));

        verify(workflowService, times(1)).startDisputeProcess(eq(disputeId),anyString());
        verify(disputeService).get(any(AuthenticatedUser.class),eq(disputeId));
        verify(disputeService, times(1)).associateWorkflowInstance(eq(disputeId), eq(processInstanceId), anyString());
    }

    @Test
    void analystCannotSubmitDispute() throws Exception {
        mockMvc.perform(post("/api/v1/disputes").with(httpBasic("analyst01", "demo"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    void invalidPayloadIsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/disputes").with(httpBasic("customer01", "demo"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reasonCode\":\"POSSIBLE_DUPLICATE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.violations[?(@.field == 'transactionId')]").exists())
                .andExpect(jsonPath("$.violations[?(@.field == 'candidateTransactionId')]").exists());
    }

    @Test
    void candidateTransactionIsRequired() throws Exception {
        mockMvc.perform(post("/api/v1/disputes").with(httpBasic("customer01", "demo"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"transactionId\":\"%s\",\"reasonCode\":\"POSSIBLE_DUPLICATE\"}"
                                .formatted(TRANSACTION_ID)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.violations[0].field").value("candidateTransactionId"));
    }

    @Test
    void ineligibleTransactionIsUnprocessable() throws Exception {
        when(disputeService.submit(any(), any(), anyString()))
                .thenThrow(new BusinessRuleViolationException("TRANSACTION_NOT_POSTED", "Only posted"));

        mockMvc.perform(post("/api/v1/disputes").with(httpBasic("customer01", "demo"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errorCode").value("TRANSACTION_NOT_POSTED"));

        verify(workflowService, never())
                .startDisputeProcess(any(), anyString());
    }

    @Test
    void duplicateOpenDisputeIsConflict() throws Exception {
        when(disputeService.submit(any(), any(), anyString()))
                .thenThrow(new ConflictException("OPEN_DISPUTE_EXISTS", "Already open"));

        mockMvc.perform(post("/api/v1/disputes").with(httpBasic("customer01", "demo"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("OPEN_DISPUTE_EXISTS"));

        verify(workflowService, never())
                .startDisputeProcess(any(), anyString());
    }

    @Test
    void wrongPasswordIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/disputes").with(httpBasic("customer01", "wrong")))
                .andExpect(status().isUnauthorized());
    }

    private static DisputeResponse response(UUID disputeId) {
        Instant now = Instant.parse("2026-10-21T10:00:00Z");
        TransactionResponse transaction = new TransactionResponse(UUID.fromString(TRANSACTION_ID), "4821",
                "CAFE AROMA BOGOTA 001", "SYN-0001", new BigDecimal("35000.0000"), "COP", TransactionStatus.POSTED,
                now, now);
        TransactionResponse candidate = new TransactionResponse(UUID.fromString(CANDIDATE_ID), "4821",
                "CAFE AROMA BOGOTA 001", "SYN-0002", new BigDecimal("35000.0000"), "COP", TransactionStatus.POSTED,
                now, now);
        return new DisputeResponse(disputeId, DisputeStatus.SUBMITTED, ReasonCode.POSSIBLE_DUPLICATE,
                "Charged twice", null, transaction, candidate, null, now, now, null);
    }
}
