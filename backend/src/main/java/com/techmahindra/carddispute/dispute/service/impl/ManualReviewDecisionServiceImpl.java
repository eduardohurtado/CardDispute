
package com.techmahindra.carddispute.dispute.service.impl;

import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.service.ManualReviewDecisionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
public class ManualReviewDecisionServiceImpl implements ManualReviewDecisionService {

    public void validateManualDecision(
            UUID disputeId,
            DecisionType decision,
            String comment,
            String analystUsername
    ) {
        log.info("Validating manual decision for dispute {}", disputeId);
        throw new UnsupportedOperationException("Manual validation not implemented");
    }

    public void resolveManually(
            UUID disputeId,
            DecisionType decision,
            String comment,
            String analystUsername,
            String correlationId
    ) {
        log.info("Resolving dispute {} manually", disputeId);
        throw new UnsupportedOperationException("Manual resolution not implemented");
    }
}
