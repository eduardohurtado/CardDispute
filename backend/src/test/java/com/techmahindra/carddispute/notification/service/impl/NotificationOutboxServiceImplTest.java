package com.techmahindra.carddispute.notification.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.techmahindra.carddispute.notification.dto.DisputeResolvedEvent;
import com.techmahindra.carddispute.notification.entity.NotificationOutbox;
import com.techmahindra.carddispute.notification.repository.NotificationOutboxRepository;

class NotificationOutboxServiceImplTest {

    @Test
    void savesResolvedEventAsPendingJson() throws Exception {

        NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);

        ObjectMapper objectMapper =
                new ObjectMapper()
                        .registerModule(new JavaTimeModule())
                        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        NotificationOutboxServiceImpl service =
                new NotificationOutboxServiceImpl(repository, objectMapper);

        UUID disputeId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        Instant occurredAt = Instant.parse("2026-10-28T15:00:00Z");

        DisputeResolvedEvent event =
                new DisputeResolvedEvent(
                        eventId,
                        "DISPUTE_RESOLVED",
                        occurredAt,
                        disputeId,
                        customerId,
                        "SUPPORTED",
                        "corr-001");

        service.saveDisputeResolvedEvent(event);

        ArgumentCaptor<NotificationOutbox> captor =
                ArgumentCaptor.forClass(NotificationOutbox.class);

        verify(repository, times(1)).save(captor.capture());

        NotificationOutbox saved = captor.getValue();

        assertThat(saved.getOutboxId()).isEqualTo(eventId);
        assertThat(saved.getDisputeId()).isEqualTo(disputeId);
        assertThat(saved.getEventType()).isEqualTo("DISPUTE_RESOLVED");
        assertThat(saved.getStatus()).isEqualTo("PENDING");
        assertThat(saved.getAttemptCount()).isZero();
        assertThat(saved.getCreatedAt()).isEqualTo(occurredAt);
        assertThat(saved.getNextAttemptAt()).isEqualTo(occurredAt);

        var payload = objectMapper.readTree(saved.getPayload());

        assertThat(payload.size()).isEqualTo(7);
        assertThat(payload.get("eventId").asText()).isEqualTo(eventId.toString());
        assertThat(payload.get("eventType").asText()).isEqualTo("DISPUTE_RESOLVED");
        assertThat(payload.get("occurredAt").asText()).isEqualTo(occurredAt.toString());
        assertThat(payload.get("disputeId").asText()).isEqualTo(disputeId.toString());
        assertThat(payload.get("customerId").asText()).isEqualTo(customerId.toString());
        assertThat(payload.get("outcome").asText()).isEqualTo("SUPPORTED");
        assertThat(payload.get("correlationId").asText()).isEqualTo("corr-001");
    }
}
