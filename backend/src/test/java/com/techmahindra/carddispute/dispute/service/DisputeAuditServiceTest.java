package com.techmahindra.carddispute.dispute.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.techmahindra.carddispute.dispute.dto.TimelineEntryResponse;
import com.techmahindra.carddispute.dispute.entity.AuditEventType;
import com.techmahindra.carddispute.dispute.entity.DisputeAuditEvent;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.repository.DisputeAuditEventRepository;

class DisputeAuditServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-23T10:00:00Z");

    private final DisputeAuditEventRepository repository = mock(DisputeAuditEventRepository.class);
    private final DisputeAuditService service = new DisputeAuditService(repository);

    @Test
    void savesEvent() {
        UUID disputeId = UUID.randomUUID();

        service.record(
                disputeId,
                AuditEventType.STATE_CHANGED,
                DisputeStatus.SUBMITTED,
                DisputeStatus.IN_REVIEW,
                "SYSTEM",
                "corr-1",
                "Accepted for review",
                NOW);

        DisputeAuditEvent event = saved();
        assertThat(event.getDisputeId()).isEqualTo(disputeId);
        assertThat(event.getEventType()).isEqualTo(AuditEventType.STATE_CHANGED);
        assertThat(event.getOldStatus()).isEqualTo(DisputeStatus.SUBMITTED);
        assertThat(event.getNewStatus()).isEqualTo(DisputeStatus.IN_REVIEW);
        assertThat(event.getActorId()).isEqualTo("SYSTEM");
        assertThat(event.getCorrelationId()).isEqualTo("corr-1");
        assertThat(event.getDetails()).isEqualTo("Accepted for review");
        assertThat(event.getOccurredAt()).isEqualTo(NOW);
    }

    @Test
    void truncatesDetailsToColumnSize() {
        service.record(
                UUID.randomUUID(),
                AuditEventType.ASSESSED,
                null,
                null,
                "SYSTEM",
                "corr-1",
                "x".repeat(1500),
                NOW);

        assertThat(saved().getDetails()).hasSize(1000);
    }

    @Test
    void mapsTimelineInRepositoryOrder() {
        UUID disputeId = UUID.randomUUID();
        when(repository.findByDisputeIdOrderByOccurredAtAscAuditIdAsc(disputeId))
                .thenReturn(
                        List.of(
                                DisputeAuditEvent.of(
                                        disputeId,
                                        AuditEventType.CREATED,
                                        null,
                                        DisputeStatus.SUBMITTED,
                                        "customer01",
                                        "corr-1",
                                        "Dispute submitted by customer",
                                        NOW),
                                DisputeAuditEvent.of(
                                        disputeId,
                                        AuditEventType.STATE_CHANGED,
                                        DisputeStatus.SUBMITTED,
                                        DisputeStatus.IN_REVIEW,
                                        "SYSTEM",
                                        "corr-1",
                                        null,
                                        NOW.plusSeconds(1))));

        List<TimelineEntryResponse> timeline = service.timeline(disputeId);

        assertThat(timeline)
                .extracting(TimelineEntryResponse::eventType)
                .containsExactly(AuditEventType.CREATED, AuditEventType.STATE_CHANGED);
        assertThat(timeline.get(0).actorId()).isEqualTo("customer01");
        assertThat(timeline.get(1).newStatus()).isEqualTo(DisputeStatus.IN_REVIEW);
        assertThat(timeline.get(1).occurredAt()).isEqualTo(NOW.plusSeconds(1));
    }

    private DisputeAuditEvent saved() {
        ArgumentCaptor<DisputeAuditEvent> captor = ArgumentCaptor.forClass(DisputeAuditEvent.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }
}
