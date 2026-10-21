package com.techmahindra.carddispute.transaction.service;

import com.techmahindra.carddispute.transaction.dto.AssessmentResult;

import java.util.UUID;

public interface TransactionAssessmentService {
    AssessmentResult assessDispute(UUID disputeId);
}
