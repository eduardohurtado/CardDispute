package com.techmahindra.carddispute.dispute.entity;

public enum DecisionType {
    DUPLICATE_SUPPORTED(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED),
    NOT_SUPPORTED(DisputeStatus.RESOLVED_NOT_SUPPORTED);

    private final DisputeStatus resultingStatus;

    DecisionType(DisputeStatus resultingStatus) {
        this.resultingStatus = resultingStatus;
    }

    public DisputeStatus resultingStatus() {
        return resultingStatus;
    }
}
