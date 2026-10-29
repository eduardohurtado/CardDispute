package com.techmahindra.carddispute.dispute.entity;

import java.util.EnumSet;
import java.util.Set;

/**
 * Business state machine of a dispute (owned by the dispute module, not by Camunda). The "open"
 * statuses must match the filtered unique index {@code UX_dispute_case_active_transaction}.
 */
public enum DisputeStatus {
    SUBMITTED,
    IN_REVIEW,
    AWAITING_ANALYST,
    /** Exception state, not a final banking verdict: an analyst can still resolve it. */
    TIMEOUT_REVIEW_REQUIRED,
    RESOLVED_DUPLICATE_SUPPORTED,
    RESOLVED_NOT_SUPPORTED,
    /** Reserved: the POC rejects ineligible submissions with HTTP 422 instead of recording them. */
    REJECTED_INELIGIBLE;

    public static final Set<DisputeStatus> OPEN =
            EnumSet.of(SUBMITTED, IN_REVIEW, AWAITING_ANALYST, TIMEOUT_REVIEW_REQUIRED);

    public boolean isOpen() {
        return OPEN.contains(this);
    }

    public boolean isTerminal() {
        return !isOpen();
    }

    public boolean canTransitionTo(DisputeStatus target) {
        return switch (this) {
            case SUBMITTED -> target == IN_REVIEW || target == REJECTED_INELIGIBLE;
            case IN_REVIEW -> target == AWAITING_ANALYST || isResolution(target);
            case AWAITING_ANALYST -> target == TIMEOUT_REVIEW_REQUIRED || isResolution(target);
            case TIMEOUT_REVIEW_REQUIRED -> isResolution(target);
            case RESOLVED_DUPLICATE_SUPPORTED, RESOLVED_NOT_SUPPORTED, REJECTED_INELIGIBLE -> false;
        };
    }

    private static boolean isResolution(DisputeStatus status) {
        return status == RESOLVED_DUPLICATE_SUPPORTED || status == RESOLVED_NOT_SUPPORTED;
    }
}
