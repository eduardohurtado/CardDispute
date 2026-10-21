package com.techmahindra.carddispute.transaction.service.impl;

import com.techmahindra.carddispute.transaction.dto.AssessmentResult;
import com.techmahindra.carddispute.transaction.service.TransactionAssessmentService;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class TransactionAssessmentServiceImpl implements TransactionAssessmentService {

    @Override
    public AssessmentResult assessDispute(UUID disputeId) {
        throw new UnsupportedOperationException("Not yet implemented");
    }
}
