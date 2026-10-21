package com.techmahindra.carddispute.workflow.service.impl;

import com.techmahindra.carddispute.workflow.service.WorkflowService;
import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class WorkflowServiceImpl implements WorkflowService {

    private static final String PROCESS_DEFINITION_KEY = "card-dispute-process";

    private final RuntimeService runtimeService;

    public WorkflowServiceImpl(RuntimeService runtimeService) {
        this.runtimeService = runtimeService;
    }

    public String startDisputeProcess(UUID disputeId, String correlationId) {

        Objects.requireNonNull(disputeId, "disputeId must not be null");

        if (correlationId == null || correlationId.isBlank()) {
            throw new IllegalArgumentException("correlationId must not be blank");
        }

        String businessKey = disputeId.toString();

        Map<String, Object> variables = new HashMap<>();
        variables.put("disputeId", businessKey);
        variables.put("correlationId", correlationId);

        ProcessInstance instance = runtimeService.startProcessInstanceByKey(
                PROCESS_DEFINITION_KEY, businessKey, variables);

        return instance.getProcessInstanceId();
    }
}
