package com.techmahindra.carddispute.workflow.service;

import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.workflow.dto.CompleteManualReviewRequest;
import com.techmahindra.carddispute.workflow.dto.ManualReviewCompletionResponse;

public interface ReviewTaskCompletionService {

    ManualReviewCompletionResponse complete(
            String taskId,
            CompleteManualReviewRequest request,
            AuthenticatedUser analyst,
            String correlationId);
}
