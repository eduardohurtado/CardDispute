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
@Table(name = "notification_delivery")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationDelivery {

    @Id
    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "dispute_id", nullable = false)
    private UUID disputeId;

    @Column(name = "channel", nullable = false, length = 12)
    private String channel;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    @Column(name = "provider_ref", length = 80)
    private String providerRef;

    @Column(name = "error_code", length = 60)
    private String errorCode;

    public static NotificationDelivery of(
            UUID eventId,
            UUID disputeId,
            String channel,
            String status,
            Instant processedAt,
            String providerRef,
            String errorCode) {

        NotificationDelivery delivery = new NotificationDelivery();
        delivery.eventId = eventId;
        delivery.disputeId = disputeId;
        delivery.channel = channel;
        delivery.status = status;
        delivery.processedAt = processedAt;
        delivery.providerRef = providerRef;
        delivery.errorCode = errorCode;

        return delivery;
    }
}
