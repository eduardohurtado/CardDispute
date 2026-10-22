package com.techmahindra.carddispute.dispute.entity;

import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.transaction.service.AssessmentOutcome;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "dispute_case")
public class DisputeCase {

    @Id
    @Column(name = "dispute_id")
    private UUID disputeId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "transaction_id", nullable = false)
    private UUID transactionId;

    @Column(name = "candidate_transaction_id", nullable = false)
    private UUID candidateTransactionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false)
    private ReasonCode reasonCode;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DisputeStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_outcome")
    private AssessmentOutcome assessmentOutcome;

    @Column(name = "workflow_instance_id")
    private String workflowInstanceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public static DisputeCase submit(UUID customerId, UUID transactionId, UUID candidateTransactionId,
                                     ReasonCode reasonCode, String description, Instant now) {
        DisputeCase dispute = new DisputeCase();
        dispute.disputeId = UUID.randomUUID();
        dispute.customerId = customerId;
        dispute.transactionId = transactionId;
        dispute.candidateTransactionId = candidateTransactionId;
        dispute.reasonCode = reasonCode;
        dispute.description = description;
        dispute.status = DisputeStatus.SUBMITTED;
        dispute.createdAt = now;
        dispute.updatedAt = now;
        return dispute;
    }

    /** Moves the case through the state machine; terminal states are immutable. */
    public void transitionTo(DisputeStatus target, Instant now) {
        if (!status.canTransitionTo(target)) {
            throw new ConflictException("INVALID_STATE_TRANSITION",
                    "Dispute " + disputeId + " cannot move from " + status + " to " + target);
        }
        status = target;
        updatedAt = now;
        if (target.isTerminal()) {
            resolvedAt = now;
        }
    }

    public void recordAssessment(AssessmentOutcome outcome, Instant now) {
        assessmentOutcome = outcome;
        updatedAt = now;
    }
}
