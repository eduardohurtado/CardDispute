package com.techmahindra.carddispute.dispute.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/** Final (immutable) banking decision for a dispute; one per dispute (unique constraint). */
@Entity
@Table(name = "dispute_decision")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DisputeDecision {

    @Id
    @Column(name = "decision_id")
    private UUID decisionId;

    @Column(name = "dispute_id", nullable = false, updatable = false)
    private UUID disputeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision_type", nullable = false, updatable = false)
    private DecisionType decisionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision_source", nullable = false, updatable = false)
    private DecisionSource decisionSource;

    @Column(name = "rationale", nullable = false, updatable = false)
    private String rationale;

    @Column(name = "decided_by", nullable = false, updatable = false)
    private String decidedBy;

    @Column(name = "decided_at", nullable = false, updatable = false)
    private Instant decidedAt;

    public static DisputeDecision of(UUID disputeId, DecisionType type, DecisionSource source,
                                     String rationale, String decidedBy, Instant decidedAt) {
        DisputeDecision decision = new DisputeDecision();
        decision.decisionId = UUID.randomUUID();
        decision.disputeId = disputeId;
        decision.decisionType = type;
        decision.decisionSource = source;
        decision.rationale = rationale;
        decision.decidedBy = decidedBy;
        decision.decidedAt = decidedAt;
        return decision;
    }
}
