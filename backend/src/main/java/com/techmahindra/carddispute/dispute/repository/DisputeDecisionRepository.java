package com.techmahindra.carddispute.dispute.repository;

import com.techmahindra.carddispute.dispute.entity.DisputeDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DisputeDecisionRepository extends JpaRepository<DisputeDecision, UUID> {

    Optional<DisputeDecision> findByDisputeId(UUID disputeId);
}
