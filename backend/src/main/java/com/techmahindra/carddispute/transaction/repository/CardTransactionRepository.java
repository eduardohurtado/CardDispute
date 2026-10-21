package com.techmahindra.carddispute.transaction.repository;

import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CardTransactionRepository extends JpaRepository<CardTransaction, UUID> {

    Optional<CardTransaction> findByTransactionIdAndCustomerId(UUID transactionId, UUID customerId);

    Page<CardTransaction> findByCustomerId(UUID customerId, Pageable pageable);

    Page<CardTransaction> findByCustomerIdAndStatus(UUID customerId, TransactionStatus status, Pageable pageable);
}
