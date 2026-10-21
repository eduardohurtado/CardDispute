package com.techmahindra.carddispute.dispute.service.impl;

import com.techmahindra.carddispute.dispute.service.DisputeService;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class DisputeServiceImpl implements DisputeService {

    @Override
    public void markInReview(UUID disputeId) {
        throw new UnsupportedOperationException("Not yet implemented");
    }

    @Override
    public void resolveAutomatically(UUID disputeId, String outcome, String rationale) {
        throw new UnsupportedOperationException("Not yet implemented");
    }
}
