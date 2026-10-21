package com.techmahindra.carddispute.workflow.service;

import java.util.UUID;

/** Starts the Card Dispute process using the dispute identifier as its business key. */
public interface WorkflowService {

    /**
     * Starts the process synchronously. Service tasks may execute before this call returns.
     *
     * @return the Camunda process instance identifier (not the business dispute identifier)
     */
    String startDisputeProcess(UUID disputeId, String correlationId);
}
