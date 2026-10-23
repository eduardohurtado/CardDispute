package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.dispute.entity.AuditEventType;
import com.techmahindra.carddispute.dispute.entity.DisputeAuditEvent;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.repository.DisputeAuditEventRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class DisputeAuditServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-23T10:00:00Z");

    private final DisputeAuditEventRepository repository = mock(DisputeAuditEventRepository.class);
    private final DisputeAuditService service = new DisputeAuditService(repository);

    @Test
    void savesEvent() {
        UUID disputeId = UUID.randomUUID();

        service.record(disputeId, AuditEventType.STATE_CHANGED, DisputeStatus.SUBMITTED, DisputeStatus.IN_REVIEW,
                "SYSTEM", "corr-1", "Accepted for review", NOW);

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
        service.record(UUID.randomUUID(), AuditEventType.ASSESSED, null, null, "SYSTEM", "corr-1",
                "x".repeat(1500), NOW);

        assertThat(saved().getDetails()).hasSize(1000);
    }

    private DisputeAuditEvent saved() {
        ArgumentCaptor<DisputeAuditEvent> captor = ArgumentCaptor.forClass(DisputeAuditEvent.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }
}
