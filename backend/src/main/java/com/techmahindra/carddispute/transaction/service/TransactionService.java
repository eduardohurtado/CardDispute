package com.techmahindra.carddispute.transaction.service;

import com.techmahindra.carddispute.common.exception.BusinessRuleViolationException;
import com.techmahindra.carddispute.common.exception.ResourceNotFoundException;
import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.transaction.dto.TransactionResponse;
import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;
import com.techmahindra.carddispute.transaction.repository.CardTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(DisputeRulesProperties.class)
public class TransactionService {

    private final CardTransactionRepository transactionRepository;
    private final DisputeRulesProperties rules;

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> listOwned(UUID customerId, TransactionStatus status, Pageable pageable) {
        Page<CardTransaction> page = status == null
                ? transactionRepository.findByCustomerId(customerId, pageable)
                : transactionRepository.findByCustomerIdAndStatus(customerId, status, pageable);
        return PageResponse.of(page, TransactionResponse::from);
    }

    @Transactional(readOnly = true)
    public TransactionResponse getOwnedResponse(UUID customerId, UUID transactionId) {
        return TransactionResponse.from(getOwned(customerId, transactionId));
    }

    /** Returns the transaction only if it belongs to the customer; otherwise 404 (no existence leak). */
    @Transactional(readOnly = true)
    public CardTransaction getOwned(UUID customerId, UUID transactionId) {
        return findOwned(customerId, transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("TRANSACTION_NOT_FOUND",
                        "Transaction " + transactionId + " was not found"));
    }

    @Transactional(readOnly = true)
    public Optional<CardTransaction> findOwned(UUID customerId, UUID transactionId) {
        return transactionRepository.findByTransactionIdAndCustomerId(transactionId, customerId);
    }

    @Transactional(readOnly = true)
    public CardTransaction getById(UUID transactionId) {
        return transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("TRANSACTION_NOT_FOUND",
                        "Transaction " + transactionId + " was not found"));
    }

    @Transactional(readOnly = true)
    public List<CardTransaction> findAllById(Collection<UUID> transactionIds) {
        return transactionRepository.findAllById(transactionIds);
    }

    /** Synthetic eligibility: only POSTED purchases, submitted within the eligibility window. */
    public void requireDisputable(CardTransaction transaction, Instant now) {
        if (transaction.getStatus() != TransactionStatus.POSTED || transaction.getPostedAt() == null) {
            throw new BusinessRuleViolationException("TRANSACTION_NOT_POSTED",
                    "Only posted transactions can be disputed (current status: " + transaction.getStatus() + ")");
        }
        if (transaction.getPostedAt().plus(rules.eligibilityWindow()).isBefore(now)) {
            throw new BusinessRuleViolationException("DISPUTE_WINDOW_EXPIRED",
                    "Transactions can only be disputed within " + rules.eligibilityWindow().toDays()
                            + " days of posting");
        }
    }
}
