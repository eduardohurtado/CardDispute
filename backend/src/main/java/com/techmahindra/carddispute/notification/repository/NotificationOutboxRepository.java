package com.techmahindra.carddispute.notification.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.techmahindra.carddispute.notification.entity.NotificationOutbox;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, UUID> {

    List<NotificationOutbox> findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            String status, Instant nextAttemptAt);

    @Modifying
    @Transactional(transactionManager = "cardDisputeTransactionManager")
    @Query(
            """
        UPDATE NotificationOutbox o
           SET o.status = 'PUBLISHED',
               o.publishedAt = :publishedAt,
               o.lastError = null
         WHERE o.outboxId = :outboxId
           AND o.status = 'PENDING'
        """)
    int markPublished(@Param("outboxId") UUID outboxId, @Param("publishedAt") Instant publishedAt);

    @Modifying
    @Transactional(transactionManager = "cardDisputeTransactionManager")
    @Query(
            """
        UPDATE NotificationOutbox o
           SET o.status = :status,
               o.attemptCount = :newAttemptCount,
               o.nextAttemptAt = :nextAttemptAt,
               o.lastError = :lastError
         WHERE o.outboxId = :outboxId
           AND o.status = 'PENDING'
           AND o.attemptCount = :expectedAttemptCount
        """)
    int recordPublicationFailure(
            @Param("outboxId") UUID outboxId,
            @Param("status") String status,
            @Param("expectedAttemptCount") int expectedAttemptCount,
            @Param("newAttemptCount") int newAttemptCount,
            @Param("nextAttemptAt") Instant nextAttemptAt,
            @Param("lastError") String lastError);
}
