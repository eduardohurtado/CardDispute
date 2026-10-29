package com.techmahindra.carddispute.dispute.repository;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.techmahindra.carddispute.dispute.entity.DisputeCase;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;

public interface DisputeCaseRepository extends JpaRepository<DisputeCase, UUID> {

    Optional<DisputeCase> findByDisputeIdAndCustomerId(UUID disputeId, UUID customerId);

    Page<DisputeCase> findByCustomerId(UUID customerId, Pageable pageable);

    Page<DisputeCase> findByCustomerIdAndStatus(
            UUID customerId, DisputeStatus status, Pageable pageable);

    Page<DisputeCase> findByStatus(DisputeStatus status, Pageable pageable);

    /**
     * Fast-fail precheck: is any of the transactions already part of an open dispute, either as the
     * disputed charge or as its suspected duplicate? The filtered unique index remains the real
     * guard.
     */
    @Query(
            """
            select count(d) > 0 from DisputeCase d
            where d.status in :openStatuses
              and (d.transactionId in :transactionIds or d.candidateTransactionId in :transactionIds)
            """)
    boolean existsOpenDisputeInvolving(
            @Param("transactionIds") Collection<UUID> transactionIds,
            @Param("openStatuses") Collection<DisputeStatus> openStatuses);
}
