package com.techmahindra.carddispute.dispute.repository;

import com.techmahindra.carddispute.dispute.entity.DisputeAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DisputeAuditEventRepository extends JpaRepository<DisputeAuditEvent, Long> {

    List<DisputeAuditEvent> findByDisputeIdOrderByOccurredAtAscAuditIdAsc(UUID disputeId);
}
