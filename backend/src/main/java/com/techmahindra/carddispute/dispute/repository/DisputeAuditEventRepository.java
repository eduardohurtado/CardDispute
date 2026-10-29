package com.techmahindra.carddispute.dispute.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techmahindra.carddispute.dispute.entity.DisputeAuditEvent;

public interface DisputeAuditEventRepository extends JpaRepository<DisputeAuditEvent, Long> {

    List<DisputeAuditEvent> findByDisputeIdOrderByOccurredAtAscAuditIdAsc(UUID disputeId);
}
