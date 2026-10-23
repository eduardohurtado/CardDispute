package com.techmahindra.carddispute.dispute.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/** Business audit record (append-only). Camunda history is not the banking audit trail. */
@Entity
@Table(name = "dispute_audit_event")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DisputeAuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    private Long auditId;

    @Column(name = "dispute_id", nullable = false, updatable = false)
    private UUID disputeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, updatable = false)
    private AuditEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status", updatable = false)
    private DisputeStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", updatable = false)
    private DisputeStatus newStatus;

    @Column(name = "actor_id", nullable = false, updatable = false)
    private String actorId;

    @Column(name = "correlation_id", nullable = false, updatable = false)
    private String correlationId;

    @Column(name = "details", updatable = false)
    private String details;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    public static DisputeAuditEvent of(UUID disputeId, AuditEventType eventType, DisputeStatus oldStatus,
                                       DisputeStatus newStatus, String actorId, String correlationId,
                                       String details, Instant occurredAt) {
        DisputeAuditEvent event = new DisputeAuditEvent();
        event.disputeId = disputeId;
        event.eventType = eventType;
        event.oldStatus = oldStatus;
        event.newStatus = newStatus;
        event.actorId = actorId;
        event.correlationId = correlationId;
        event.details = details;
        event.occurredAt = occurredAt;
        return event;
    }
}
