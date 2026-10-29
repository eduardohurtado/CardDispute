package com.techmahindra.carddispute.dispute.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techmahindra.carddispute.dispute.entity.DisputeDecision;

public interface DisputeDecisionRepository extends JpaRepository<DisputeDecision, UUID> {

    Optional<DisputeDecision> findByDisputeId(UUID disputeId);
}
