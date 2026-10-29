package com.techmahindra.carddispute.notification.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "notification_outbox")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationOutbox {

    public static final String PENDING = "PENDING";
    public static final String PUBLISHED = "PUBLISHED";
    public static final String FAILED = "FAILED";

    @Id
    @Column(name = "outbox_id", nullable = false)
    private UUID outboxId;

    @Column(name = "dispute_id", nullable = false)
    private UUID disputeId;

    @Column(name = "event_type", nullable = false, length = 40)
    private String eventType;

    @Column(name = "payload", nullable = false, columnDefinition = "nvarchar(max)")
    private String payload;

    @Column(name = "status", nullable = false, length = 16)
    private String status;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_error", length = 500)
    private String lastError;

    public static NotificationOutbox pending(
            UUID eventId, UUID disputeId, String eventType, String payload, Instant occurredAt) {

        NotificationOutbox event = new NotificationOutbox();

        event.outboxId = eventId;
        event.disputeId = disputeId;
        event.eventType = eventType;
        event.payload = payload;
        event.status = PENDING;
        event.attemptCount = 0;
        event.nextAttemptAt = occurredAt;
        event.createdAt = occurredAt;

        return event;
    }
}
