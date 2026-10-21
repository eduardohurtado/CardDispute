package com.techmahindra.carddispute.dispute.service;

import java.util.UUID;

public interface DisputeService {

    void markInReview(UUID disputeId);
    void resolveAutomatically(UUID disputeId, String outcome, String rationale);
}
