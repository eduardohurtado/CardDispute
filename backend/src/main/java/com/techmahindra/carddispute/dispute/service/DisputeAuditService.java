package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.dispute.dto.TimelineEntryResponse;
import com.techmahindra.carddispute.dispute.entity.AuditEventType;
import com.techmahindra.carddispute.dispute.entity.DisputeAuditEvent;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.repository.DisputeAuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Business audit trail of a dispute. Each event is written in the same transaction as the change
 * it records, so a rolled-back change leaves no audit entry.
 */
@Service
@RequiredArgsConstructor
public class DisputeAuditService {

    private static final int MAX_DETAILS_LENGTH = 1000;

    private final DisputeAuditEventRepository auditRepository;

    @Transactional(transactionManager = "cardDisputeTransactionManager")
    public void record(UUID disputeId, AuditEventType eventType, DisputeStatus oldStatus, DisputeStatus newStatus,
                       String actorId, String correlationId, String details, Instant occurredAt) {
        auditRepository.save(DisputeAuditEvent.of(disputeId, eventType, oldStatus, newStatus, actorId,
                correlationId, truncate(details), occurredAt));
    }

    @Transactional(transactionManager = "cardDisputeTransactionManager", readOnly = true)
    public List<TimelineEntryResponse> timeline(UUID disputeId) {
        return auditRepository.findByDisputeIdOrderByOccurredAtAscAuditIdAsc(disputeId).stream()
                .map(TimelineEntryResponse::from)
                .toList();
    }

    private static String truncate(String details) {
        if (details == null || details.length() <= MAX_DETAILS_LENGTH) {
            return details;
        }
        return details.substring(0, MAX_DETAILS_LENGTH);
    }
}
