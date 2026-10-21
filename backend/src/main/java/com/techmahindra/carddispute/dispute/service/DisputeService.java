package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.common.exception.BusinessRuleViolationException;
import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.common.exception.ResourceNotFoundException;
import com.techmahindra.carddispute.common.security.AuthenticatedUser;
import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.dispute.dto.CreateDisputeRequest;
import com.techmahindra.carddispute.dispute.dto.DecisionResponse;
import com.techmahindra.carddispute.dispute.dto.DisputeResponse;
import com.techmahindra.carddispute.dispute.dto.DisputeSummaryResponse;
import com.techmahindra.carddispute.dispute.entity.DisputeCase;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.repository.DisputeCaseRepository;
import com.techmahindra.carddispute.dispute.repository.DisputeDecisionRepository;
import com.techmahindra.carddispute.transaction.dto.TransactionResponse;
import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.service.TransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Customer-facing dispute use cases: submit, list and view. */
@Slf4j
@Service
@RequiredArgsConstructor
public class DisputeService {

    private final DisputeCaseRepository disputeRepository;
    private final DisputeDecisionRepository decisionRepository;
    private final TransactionService transactionService;
    private final Clock clock;

    /**
     * Validates ownership and eligibility and records the case as SUBMITTED. Invalid submissions are
     * rejected with an HTTP error and create no dispute.
     */
    @Transactional
    public DisputeResponse submit(AuthenticatedUser customer, CreateDisputeRequest request, String correlationId) {
        UUID customerId = customer.requireCustomerId();
        Instant now = clock.instant();

        CardTransaction transaction = transactionService.getOwned(customerId, request.transactionId());
        transactionService.requireDisputable(transaction, now);
        CardTransaction candidate = getCandidate(customerId, request);

        List<UUID> involved = List.of(transaction.getTransactionId(), candidate.getTransactionId());
        if (disputeRepository.existsOpenDisputeInvolving(involved, DisputeStatus.OPEN)) {
            throw openDisputeExists();
        }

        DisputeCase dispute = DisputeCase.submit(customerId, transaction.getTransactionId(),
                candidate.getTransactionId(), request.reasonCode(), trimToNull(request.description()), now);
        try {
            // Flush now so the filtered unique index rejects concurrent duplicates inside this call
            disputeRepository.saveAndFlush(dispute);
        } catch (DataIntegrityViolationException ex) {
            log.info("Concurrent submission rejected by unique index for transaction {}", transaction.getTransactionId());
            throw openDisputeExists();
        }

        log.info("Dispute {} submitted by {} for transaction {} (correlationId={})", dispute.getDisputeId(),
                customer.getUsername(), transaction.getTransactionId(), correlationId);
        return toResponse(dispute, transaction, candidate);
    }

    @Transactional(readOnly = true)
    public PageResponse<DisputeSummaryResponse> list(AuthenticatedUser user, DisputeStatus status, Pageable pageable) {
        Page<DisputeCase> page;
        if (user.isAnalyst()) {
            page = status == null ? disputeRepository.findAll(pageable) : disputeRepository.findByStatus(status, pageable);
        } else {
            UUID customerId = user.requireCustomerId();
            page = status == null
                    ? disputeRepository.findByCustomerId(customerId, pageable)
                    : disputeRepository.findByCustomerIdAndStatus(customerId, status, pageable);
        }

        Map<UUID, CardTransaction> transactions = transactionsById(
                page.getContent().stream().map(DisputeCase::getTransactionId).toList());
        return PageResponse.of(page, dispute -> {
            CardTransaction transaction = transactions.get(dispute.getTransactionId());
            return new DisputeSummaryResponse(dispute.getDisputeId(), dispute.getTransactionId(),
                    transaction.getMerchantName(), transaction.getAmount(), transaction.getCurrency(),
                    dispute.getStatus(), dispute.getCreatedAt(), dispute.getResolvedAt());
        });
    }

    @Transactional(readOnly = true)
    public DisputeResponse get(AuthenticatedUser user, UUID disputeId) {
        DisputeCase dispute = findAuthorized(user, disputeId);
        Map<UUID, CardTransaction> transactions = transactionsById(
                List.of(dispute.getTransactionId(), dispute.getCandidateTransactionId()));
        return toResponse(dispute, transactions.get(dispute.getTransactionId()),
                transactions.get(dispute.getCandidateTransactionId()));
    }

    public void markInReview(UUID disputeId){

    }

    public void resolveAutomatically(UUID disputeId, String outcome, String rationale) {

    }

    /** Customers only see their own cases (404 otherwise); analysts see every case. */
    private DisputeCase findAuthorized(AuthenticatedUser user, UUID disputeId) {
        return (user.isAnalyst()
                ? disputeRepository.findById(disputeId)
                : disputeRepository.findByDisputeIdAndCustomerId(disputeId, user.requireCustomerId()))
                .orElseThrow(() -> disputeNotFound(disputeId));
    }

    /** The suspected duplicate selected by the customer: must be another of their own transactions. */
    private CardTransaction getCandidate(UUID customerId, CreateDisputeRequest request) {
        UUID candidateId = request.candidateTransactionId();
        if (candidateId.equals(request.transactionId())) {
            throw new BusinessRuleViolationException("INVALID_CANDIDATE",
                    "The suspected duplicate must be a different transaction");
        }
        return transactionService.findOwned(customerId, candidateId)
                .orElseThrow(() -> new BusinessRuleViolationException("INVALID_CANDIDATE",
                        "The suspected duplicate transaction was not found"));
    }

    private DisputeResponse toResponse(DisputeCase dispute, CardTransaction transaction, CardTransaction candidate) {
        DecisionResponse decision = decisionRepository.findByDisputeId(dispute.getDisputeId())
                .map(DecisionResponse::from)
                .orElse(null);
        return new DisputeResponse(dispute.getDisputeId(), dispute.getStatus(), dispute.getReasonCode(),
                dispute.getDescription(), dispute.getAssessmentOutcome(), TransactionResponse.from(transaction),
                TransactionResponse.from(candidate), decision,
                dispute.getCreatedAt(), dispute.getUpdatedAt(), dispute.getResolvedAt());
    }

    private Map<UUID, CardTransaction> transactionsById(List<UUID> ids) {
        return transactionService.findAllById(ids.stream().distinct().toList()).stream()
                .collect(Collectors.toMap(CardTransaction::getTransactionId, Function.identity()));
    }

    private static ConflictException openDisputeExists() {
        return new ConflictException("OPEN_DISPUTE_EXISTS",
                "There is already an open dispute for this transaction");
    }

    static ResourceNotFoundException disputeNotFound(UUID disputeId) {
        return new ResourceNotFoundException("DISPUTE_NOT_FOUND", "Dispute " + disputeId + " was not found");
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
