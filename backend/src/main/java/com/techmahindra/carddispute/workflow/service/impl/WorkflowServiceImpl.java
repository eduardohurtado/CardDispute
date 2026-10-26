package com.techmahindra.carddispute.workflow.service.impl;

import com.techmahindra.carddispute.workflow.service.WorkflowService;
import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class WorkflowServiceImpl implements WorkflowService {

    private static final String PROCESS_DEFINITION_KEY = "card-dispute-process";

    private final RuntimeService runtimeService;
    private final String reviewTimerDuration;

    public WorkflowServiceImpl(RuntimeService runtimeService
            , @Value("${application.dispute.rules.manual-review-timeout}") String reviewTimerDuration) {

        this.runtimeService = runtimeService;

        Duration duration = Duration.parse(reviewTimerDuration);

        if (duration.isZero() || duration.isNegative()) {
            throw new IllegalArgumentException(
                    "Manual review timeout must be positive"
            );
        }

        this.reviewTimerDuration = duration.toString();
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
        variables.put("reviewTimerDuration", reviewTimerDuration);

        ProcessInstance instance = runtimeService.startProcessInstanceByKey(
                PROCESS_DEFINITION_KEY, businessKey, variables);

        return instance.getProcessInstanceId();
    }
}
