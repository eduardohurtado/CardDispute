package com.techmahindra.carddispute.dispute.security.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.techmahindra.carddispute.dispute.controller.impl.DisputeControllerImpl;
import com.techmahindra.carddispute.dispute.service.DisputeService;
import com.techmahindra.carddispute.security.config.SecurityConfig;
import com.techmahindra.carddispute.security.service.DatabaseUserDetailsService;
import com.techmahindra.carddispute.workflow.service.WorkflowService;

@WebMvcTest(DisputeControllerImpl.class)
@Import({SecurityConfig.class, TestAuthenticationConfig.class})
class CorsConfigurationTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private DisputeService disputeService;

    @MockitoBean private WorkflowService workflowService;

    @MockitoBean private DatabaseUserDetailsService databaseUserDetailsService;

    @Test
    void allowedOriginPreflightIsAccepted() throws Exception {

        mockMvc.perform(
                        options("/api/v1/disputes")
                                .header("Origin", "http://localhost:5173")
                                .header("Access-Control-Request-Method", "POST")
                                .header(
                                        "Access-Control-Request-Headers",
                                        "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    void unknownOriginIsRejected() throws Exception {

        mockMvc.perform(
                        options("/api/v1/disputes")
                                .header("Origin", "http://localhost:9999")
                                .header("Access-Control-Request-Method", "POST")
                                .header(
                                        "Access-Control-Request-Headers",
                                        "authorization,content-type"))
                .andExpect(status().isForbidden());
    }

    @Test
    void corsDoesNotBypassAuthentication() throws Exception {

        mockMvc.perform(get("/api/v1/disputes").header("Origin", "http://localhost:5173"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
